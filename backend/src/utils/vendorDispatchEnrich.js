/** Merge VendorDispatch row with workflow shipmentDispatch on the linked VendorOrder. */
function enrichDispatchRow(dispatch) {
  if (!dispatch) return null;
  const d = dispatch.toObject ? dispatch.toObject() : { ...dispatch };
  const vo = d.vendorOrder && typeof d.vendorOrder === 'object' ? d.vendorOrder : null;
  const ship = vo?.shipmentDispatch;
  return {
    ...d,
    orderNumber: vo?.orderNumber,
    vendorOrderStatus: vo?.status,
    customerName: vo?.customerInfo?.name,
    city: vo?.deliveryAddress?.city,
    transport: {
      transporterName: d.transporterName || d.courierPartner || ship?.transporterName,
      vehicleNumber: d.vehicleDetails?.vehicleNumber || ship?.vehicleNumber,
      lrNumber: d.lrNumber || ship?.lrNumber,
      trackingNumber: d.trackingNumber || ship?.trackingNumber,
      dispatchDate: d.dispatchDate || ship?.dispatchDate,
      proofUrl: ship?.proofUrl || d.documents?.[0]?.documentUrl,
    },
  };
}

function dispatchFromVendorOrder(vo) {
  if (!vo?.shipmentDispatch) return null;
  const ship = vo.shipmentDispatch;
  const plain = vo.toObject ? vo.toObject() : vo;
  return enrichDispatchRow({
    _id: plain._id,
    vendorOrder: plain,
    status: 'dispatched',
    synthetic: true,
    dispatchType: plain.deliveryType === 'structbay_delivery' ? 'structbay_pickup' : 'vendor_delivery',
    dispatchDate: ship.dispatchDate,
    trackingNumber: ship.trackingNumber,
    courierPartner: ship.transporterName,
    transporterName: ship.transporterName,
    lrNumber: ship.lrNumber,
    vehicleDetails: ship.vehicleNumber ? { vehicleNumber: ship.vehicleNumber } : undefined,
    documents: ship.proofUrl
      ? [{ documentType: 'dispatch_note', documentUrl: ship.proofUrl, documentName: 'dispatch_proof' }]
      : [],
  });
}

function rowFromVendorOrder(vo) {
  const plain = vo && vo.toObject ? vo.toObject() : vo;
  if (!plain) return null;
  const ship = plain.shipmentDispatch || {};
  const st = String(plain.status || '').toUpperCase();
  return {
    _id: plain._id,
    orderNumber: plain.orderNumber,
    vendorOrderStatus: plain.status,
    customerName: plain.customerInfo?.name,
    city: plain.deliveryAddress?.city,
    vendor: plain.vendor,
    masterOrderNumber:
      plain.masterOrder && typeof plain.masterOrder === 'object'
        ? plain.masterOrder.orderNumber
        : undefined,
    status: st === 'DELIVERED' || st === 'COMPLETED' ? 'delivered' : 'dispatched',
    transport: {
      transporterName: ship.transporterName,
      vehicleNumber: ship.vehicleNumber,
      lrNumber: ship.lrNumber,
      trackingNumber: ship.trackingNumber,
      dispatchDate: ship.dispatchDate || plain.actualDispatchDate,
      proofUrl: ship.proofUrl,
    },
  };
}

module.exports = { enrichDispatchRow, dispatchFromVendorOrder, rowFromVendorOrder };
