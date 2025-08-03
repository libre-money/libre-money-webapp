export type Currency = {
  _id?: string;
  _rev?: string;
  $collection: string;
  name: string;
  sign: string;
  precisionMinimum?: number;
  precisionMaximum?: number;
};
