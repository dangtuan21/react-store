import list from 'src/modules/order/list/orderListReducers';
import form from 'src/modules/order/form/orderFormReducers';
import view from 'src/modules/order/view/orderViewReducers';
import destroy from 'src/modules/order/destroy/orderDestroyReducers';
import importerReducer from 'src/modules/order/importer/orderImporterReducers';
import { combineReducers } from 'redux';

export default combineReducers({
  list,
  form,
  view,
  destroy,
  importer: importerReducer,
});
