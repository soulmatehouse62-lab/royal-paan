interface KOTItem {
  itemName: string;
  quantity: number;
  note?: string;
  isDuplicate?: boolean;
}

interface KOTData {
  kotNumber: number;
  tableNumber: string;
  staffName: string;
  pax?: number;
  items: KOTItem[];
  printTime: Date;
  isDuplicate: boolean;
  restaurantName: string;
}

export function KOTTemplate({ data }: { data: KOTData }) {
  const formatTime = (date: Date) => {
    return date.toLocaleString("en-IN", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  return (
    <div
      id="kot-print"
      className="w-full max-w-xs mx-auto bg-white text-black p-2 text-sm font-mono"
      style={{ fontSize: "10pt", lineHeight: 1.4 }}
    >
      {/* Header */}
      <div className="text-center mb-3 border-b border-dashed border-black pb-2">
        <p className="font-bold text-base">{data.restaurantName}</p>
        <p className="text-xs">KITCHEN ORDER TICKET</p>
        {data.isDuplicate && (
          <p className="text-xs font-bold text-red-600">** DUPLICATE **</p>
        )}
      </div>

      {/* KOT Details */}
      <div className="mb-3 border-b border-dashed border-black pb-2">
        <div className="flex justify-between text-xs mb-1">
          <span>KOT No: {data.kotNumber.toString().padStart(5, "0")}</span>
          <span>{formatTime(data.printTime)}</span>
        </div>
        <div className="flex justify-between text-xs mb-1">
          <span>Table: {data.tableNumber}</span>
          <span>Staff: {data.staffName}</span>
        </div>
        {data.pax && <div className="text-xs">Pax: {data.pax}</div>}
      </div>

      {/* Items */}
      <div className="mb-3 border-b border-dashed border-black pb-2">
        <div className="space-y-1">
          {data.items.map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between gap-2">
                <span className="flex-1">{item.itemName}</span>
                <span className="font-bold">x{item.quantity}</span>
              </div>
              {item.note && (
                <div className="text-xs text-gray-600 ml-4">{item.note}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs">
        <p>---</p>
        <p>Please prepare and serve</p>
        <p>---</p>
      </div>
    </div>
  );
}

export function BillTemplate({
  data,
}: {
  data: {
    billNumber: number;
    tableNumber: string;
    staffName: string;
    pax?: number;
    items: Array<{
      itemName: string;
      quantity: number;
      rate: number;
      amount: number;
    }>;
    subtotal: number;
    discount: number;
    cgst: number;
    sgst: number;
    serviceCharge?: number;
    roundOff: number;
    total: number;
    printTime: Date;
    isDuplicate: boolean;
    restaurantName: string;
    address?: string;
    phone?: string;
    gstin?: string;
  };
}) {
  const formatTime = (date: Date) => {
    return date.toLocaleString("en-IN", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const formatMoney = (paise: number) => {
    return (paise / 100).toFixed(2);
  };

  return (
    <div
      id="bill-print"
      className="w-full max-w-xs mx-auto bg-white text-black p-2 text-xs font-mono"
      style={{ fontSize: "9pt", lineHeight: 1.3 }}
    >
      {/* Header */}
      <div className="text-center mb-2 border-b border-dashed border-black pb-2">
        <p className="font-bold text-sm">{data.restaurantName}</p>
        {data.address && <p className="text-[8pt]">{data.address}</p>}
        {data.phone && <p className="text-[8pt]">Ph: {data.phone}</p>}
        {data.gstin && <p className="text-[8pt]">GSTIN: {data.gstin}</p>}
        <p className="text-xs">TAX INVOICE</p>
        {data.isDuplicate && (
          <p className="font-bold text-red-600">** DUPLICATE **</p>
        )}
      </div>

      {/* Invoice Details */}
      <div className="mb-2 border-b border-dashed border-black pb-2 text-[8pt]">
        <div className="flex justify-between mb-0.5">
          <span>Bill No: {data.billNumber.toString().padStart(5, "0")}</span>
          <span>{formatTime(data.printTime)}</span>
        </div>
        <div className="flex justify-between">
          <span>Table: {data.tableNumber}</span>
          <span>Staff: {data.staffName}</span>
        </div>
        {data.pax && <div>Pax: {data.pax}</div>}
      </div>

      {/* Items Table */}
      <div className="mb-2 border-b border-dashed border-black pb-2">
        <div className="flex justify-between text-[7pt] border-b border-gray-300 pb-1 mb-1">
          <span className="flex-1">Item</span>
          <span className="w-8 text-right">Qty</span>
          <span className="w-12 text-right">Rate</span>
          <span className="w-12 text-right">Amt</span>
        </div>
        {data.items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-[8pt] mb-0.5">
            <span className="flex-1 truncate">{item.itemName}</span>
            <span className="w-8 text-right">{item.quantity}</span>
            <span className="w-12 text-right">
              {formatMoney(item.rate)}
            </span>
            <span className="w-12 text-right">
              {formatMoney(item.amount)}
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="mb-2 space-y-0.5 text-[8pt]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatMoney(data.subtotal)}</span>
        </div>
        {data.discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount:</span>
            <span>-{formatMoney(data.discount)}</span>
          </div>
        )}
        {data.cgst > 0 && (
          <div className="flex justify-between">
            <span>CGST ({data.cgst}%):</span>
            <span>{formatMoney((data.subtotal * data.cgst) / 100)}</span>
          </div>
        )}
        {data.sgst > 0 && (
          <div className="flex justify-between">
            <span>SGST ({data.sgst}%):</span>
            <span>{formatMoney((data.subtotal * data.sgst) / 100)}</span>
          </div>
        )}
        {data.serviceCharge && data.serviceCharge > 0 && (
          <div className="flex justify-between">
            <span>Service Charge:</span>
            <span>{formatMoney(data.serviceCharge)}</span>
          </div>
        )}
        {data.roundOff !== 0 && (
          <div className="flex justify-between text-gray-600">
            <span>Round Off:</span>
            <span>{formatMoney(data.roundOff)}</span>
          </div>
        )}
        <div className="border-t border-dashed border-black pt-1 mt-1 flex justify-between font-bold">
          <span>Total:</span>
          <span>{formatMoney(data.total)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center border-t border-dashed border-black pt-2">
        <p className="text-[7pt]">Thank you for visiting!</p>
        <p className="text-[7pt]">Please visit again</p>
      </div>
    </div>
  );
}
