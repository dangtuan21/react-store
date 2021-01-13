import importerActions from 'src/modules/shared/importer/importerActions';
import selectors from 'src/modules/customer/importer/customerImporterSelectors';
import CustomerService from 'src/modules/customer/customerService';
import fields from 'src/modules/customer/importer/customerImporterFields';
import { i18n } from 'src/i18n';

const customerImporterActions = importerActions(
  'CUSTOMER_IMPORTER',
  selectors,
  CustomerService.import,
  fields,
  i18n('entities.customer.importer.fileName'),
);

export default customerImporterActions;