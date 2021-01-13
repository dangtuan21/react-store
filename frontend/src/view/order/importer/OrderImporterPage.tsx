import React from 'react';
import { i18n } from 'src/i18n';
import actions from 'src/modules/order/importer/orderImporterActions';
import fields from 'src/modules/order/importer/orderImporterFields';
import selectors from 'src/modules/order/importer/orderImporterSelectors';
import ContentWrapper from 'src/view/layout/styles/ContentWrapper';
import Breadcrumb from 'src/view/shared/Breadcrumb';
import importerHoc from 'src/view/shared/importer/Importer';
import PageTitle from 'src/view/shared/styles/PageTitle';

function OrderImportPage() {
  const Importer = importerHoc(
    selectors,
    actions,
    fields,
    i18n('entities.order.importer.hint'),
  );

  return (
    <>
      <Breadcrumb
        items={[
          [i18n('dashboard.menu'), '/'],
          [i18n('entities.order.menu'), '/order'],
          [i18n('entities.order.importer.title')],
        ]}
      />

      <ContentWrapper>
        <PageTitle>
          {i18n('entities.order.importer.title')}
        </PageTitle>

        <Importer />
      </ContentWrapper>
    </>
  );
}

export default OrderImportPage;
