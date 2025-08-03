export type IncomeSource = {
  _id?: string;
  _rev?: string;
  $collection: string;
  name: string;
  fixtureCode?: string;
  dissuadeEditing?: boolean;
  denyDeletion?: boolean;
};
