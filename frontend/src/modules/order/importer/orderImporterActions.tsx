import importerActions from 'src/modules/shared/importer/importerActions';
import selectors from 'src/modules/order/importer/orderImporterSelectors';
import OrderService from 'src/modules/order/orderService';
import fields from 'src/modules/order/importer/orderImporterFields';
import { i18n } from 'src/i18n';

const orderImporterActions = importerActions(
  'ORDER_IMPORTER',
  selectors,
  OrderService.import,
  fields,
  i18n('entities.order.importer.fileName'),
);

export default orderImporterActions;