<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title"></div>
        <q-btn color="primary" text-color="white" label="Add Asset" @click="addAssetClicked" />
      </div>

      <div class="q-pa-md">
        <q-table
          :loading="isLoading"
          title="Assets"
          :rows="rows"
          :columns="columns"
          row-key="_id"
          flat
          bordered
          :rows-per-page-options="rowsPerPageOptions"
          binary-state-sort
          v-model:pagination="pagination"
          @request="dataForTableRequested"
          class="std-table-non-morphing"
        >
          <template v-slot:top-right>
            <q-input outlined rounded dense clearable debounce="1" v-model="searchFilter" label="Search by name" placeholder="Search" class="search-field">
              <template v-slot:prepend>
                <q-btn icon="search" flat round @click="dataForTableRequested" />
              </template>
            </q-input>
          </template>

          <template v-slot:body-cell-actions="rowWrapper">
            <q-td :props="rowWrapper">
              <q-btn-dropdown size="sm" color="primary" label="Edit" split @click="editClicked(rowWrapper.row)">
                <q-list>
                  <q-item clickable v-close-popup @click="addAssetPurchaseRecordClicked(rowWrapper.row)">
                    <q-item-section>
                      <q-item-label>Add Purchase Record</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="addAssetSaleRecordClicked(rowWrapper.row)">
                    <q-item-section>
                      <q-item-label>Add Sales Record</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="addAssetAppreciationDepreciationRecordClicked(rowWrapper.row)">
                    <q-item-section>
                      <q-item-label>Add Appreciation/Depreciation Record</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="deleteClicked(rowWrapper.row)">
                    <q-item-section>
                      <q-item-label>Delete</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-btn-dropdown>
            </q-td>
          </template>
        </q-table>
      </div>
    </q-card>
  </q-page>
</template>

<script lang="ts">
import { Ref, defineComponent, ref, watch } from "vue";
import { Collection, RecordType, assetTypeList, rowsPerPageOptions } from "./../constants/constants";
import { useQuasar } from "quasar";
import AddAsset from "./../components/AddAsset.vue";
import AddAssetPurchaseRecord from "./../components/AddAssetPurchaseRecord.vue";
import AddAssetSaleRecord from "./../components/AddAssetSaleRecord.vue";
import AddAssetAppreciationDepreciationRecord from "./../components/AddAssetAppreciationDepreciationRecord.vue";
import { Record } from "src/models/record";

import { pouchdbService } from "src/services/pouchdb-service";
import { Asset } from "src/models/asset";
import { dialogService } from "src/services/dialog-service";
import { sleep } from "src/utils/misc-utils";
import { Currency } from "src/models/currency";
import { computationService } from "src/services/computation-service";

export default defineComponent({
  name: "AssetsPage",
  components: {},
  setup() {
    const $q = useQuasar();

    // -----

    const searchFilter: Ref<string | null> = ref(null);

    const isLoading = ref(false);

    const columns = [
      {
        name: "name",
        required: true,
        label: "Name",
        align: "left",
        field: "name",
        sortable: true,
      },
      {
        name: "type",
        align: "left",
        label: "Type",
        sortable: true,
        field: (asset: Asset) => {
          return assetTypeList.find((assetType) => assetType.value === asset.type)?.label;
        },
      },
      {
        name: "balance",
        align: "left",
        label: "Calculated Value",
        sortable: true,
        field: "_balance",
      },
      {
        name: "currency",
        align: "left",
        label: "Currency",
        sortable: true,
        field: (asset: Asset) => {
          return `${asset._currencySign!}`;
        },
      },
      {
        name: "actions",
        label: "Actions",
      },
    ];

    let rows: Ref<any[]> = ref([]);

    const pagination = ref({
      sortBy: "name",
      descending: false,
      page: 1,
      rowsPerPage: 5,
      rowsNumber: 0,
    });

    // -----

    async function dataForTableRequested(props: any) {
      let inputPagination = props?.pagination || pagination.value;

      const { page, rowsPerPage, sortBy, descending } = inputPagination;

      isLoading.value = true;

      const skip = (page - 1) * rowsPerPage;
      const limit = rowsPerPage;

      let res = await pouchdbService.listByCollection(Collection.ASSET);
      let docList = res.docs as Asset[];
      if (searchFilter.value) {
        let regex = new RegExp(`.*${searchFilter.value}.*`, "i");
        docList = docList.filter((doc) => regex.test(doc.name));
      }
      docList.sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name) * (descending ? -1 : 1);
        } else if (sortBy === "type") {
          return b.type.localeCompare(a.type) * (descending ? -1 : 1);
        } else {
          return 0;
        }
      });

      await computationService.computeBalancesForAssets(docList);

      let totalRowCount = docList.length;
      let currentRows = docList.slice(skip, skip + limit);

      let currencyList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
      currentRows.forEach((row) => {
        row._currencySign = currencyList.find((currency) => currency._id === row.currencyId)?.sign;
      });

      console.debug({ currentRows });
      rows.value = currentRows;

      pagination.value.rowsNumber = totalRowCount;
      pagination.value.page = page;
      pagination.value.rowsPerPage = rowsPerPage;
      pagination.value.sortBy = sortBy;
      pagination.value.descending = descending;

      isLoading.value = false;
    }

    async function addAssetClicked() {
      $q.dialog({ component: AddAsset }).onOk((res) => {
        loadData();
      });
    }

    async function loadData() {
      dataForTableRequested(null);
    }

    async function addAssetPurchaseRecordClicked(asset: Asset) {
      $q.dialog({ component: AddAssetPurchaseRecord, componentProps: { existingAssetId: asset._id } }).onOk((res) => {
        loadData();
      });
    }

    async function addAssetSaleRecordClicked(asset: Asset) {
      $q.dialog({ component: AddAssetSaleRecord, componentProps: { existingAssetId: asset._id } }).onOk((res) => {
        loadData();
      });
    }

    async function addAssetAppreciationDepreciationRecordClicked(asset: Asset) {
      $q.dialog({ component: AddAssetAppreciationDepreciationRecord, componentProps: { existingAssetId: asset._id } }).onOk((res) => {
        loadData();
      });
    }

    async function editClicked(asset: Asset) {
      $q.dialog({ component: AddAsset, componentProps: { existingAssetId: asset._id } }).onOk((res) => {
        loadData();
      });
    }

    async function deleteClicked(asset: Asset) {
      let answer = await dialogService.confirm("Remove asset", `Are you sure you want to remove the asset "${asset.name}"?`);
      if (!answer) return;

      let res = await pouchdbService.removeDoc(asset);
      if (!res.ok) {
        await dialogService.alert("Error", "There was an error trying to remove the asset.");
      }

      loadData();
    }

    // -----

    loadData();

    // -----

    watch(searchFilter, (_, __) => {
      loadData();
    });

    return {
      addAssetClicked,
      searchFilter,
      rowsPerPageOptions,
      columns,
      rows,
      isLoading,
      editClicked,
      deleteClicked,
      pagination,
      dataForTableRequested,
      addAssetPurchaseRecordClicked,
      addAssetSaleRecordClicked,
      addAssetAppreciationDepreciationRecordClicked,
    };
  },
});
</script>

<style scoped lang="scss"></style>
