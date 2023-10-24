import { pouchdbService } from "./pouchdb-service";

export const dataBackupService = {
  async exportAllDataToJson(): Promise<string> {
    const res = await pouchdbService.listDocs();
    const docList = res.rows;
    const payload = {
      identity: "Cash Keeper Data Dump",
      epoch: Date.now(),
      dateTime: new Date().toISOString(),
      docList,
    };
    return JSON.stringify(payload, null, 2);
  },

  async initiateFileDownload(jsonData: string) {
    const fileName = "CashKeeperDataDump.json";
    const fileContent = jsonData;
    const blob = new Blob([fileContent], { type: "application/json" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      const windowUrl = window.URL || window.webkitURL;
      windowUrl.revokeObjectURL(url);
    }, 100);
  },
};
