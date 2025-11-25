import { boot } from "quasar/wrappers";
import { QSelect } from "quasar";

export default boot(() => {
  QSelect.props.behavior.default = () => "menu";
  QSelect.props.popupContentClass.default = () => "bg-red-500 q-pa-md";
});
