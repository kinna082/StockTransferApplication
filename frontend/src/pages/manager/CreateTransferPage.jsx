import { useEffect, useState } from "react";
import { createTransfer, getBranches, getProducts } from "../../services/api";

const emptyRow = { productCode: "", productName: "", quantity: 0 };

export default function CreateTransferPage() {
  const [sourceBranchId, setSourceBranchId] = useState(localStorage.getItem("userBranchId") || "");
  const [destinationBranchId, setDestinationBranchId] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [rows, setRows] = useState([{ ...emptyRow }]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [sourceBranchLabel, setSourceBranchLabel] = useState("");

  useEffect(() => {
    Promise.all([getBranches(), getProducts()])
      .then(([branchData, productData]) => {
        setBranches(branchData);
        setProducts(productData);
        const source = branchData.find((b) => String(b.id) === String(localStorage.getItem("userBranchId") || ""));
        setSourceBranchLabel(source ? `${source.branchCode} - ${source.branchName}` : "Branch not mapped");
      })
      .catch(() => setMessage("Could not load master data. Check API/DB connection."));
  }, []);

  const addRow = () => setRows((prev) => [...prev, { ...emptyRow }]);
  const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));

  const updateRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: field === "quantity" ? Number(value) : value } : row))
    );
  };

  const handleProductCodeBlur = (index) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const code = row.productCode.trim().toLowerCase();
        const selected = products.find((p) => p.productCode.trim().toLowerCase() === code);
        return { ...row, productName: selected?.productName ?? "" };
      })
    );
  };

  const handleSubmit = async () => {
    setMessage("");
    const validRows = rows.filter((r) => r.productCode && r.productName && Number(r.quantity) > 0);
    if (!sourceBranchId || !destinationBranchId || !transferDate || validRows.length === 0) {
      setMessage("Please fill source, destination, date and at least one valid product row.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createTransfer({
        sourceBranchId: Number(sourceBranchId),
        destinationBranchId: Number(destinationBranchId),
        transferDate,
        items: validRows.map((r) => ({
          productCode: r.productCode.trim(),
          productName: r.productName.trim(),
          quantity: Number(r.quantity)
        }))
      });
      setMessage("Transfer submitted successfully.");
      setRows([{ ...emptyRow }]);
    } catch (error) {
      setMessage(error.message || "Failed to submit transfer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section>
      <h2>Create Stock Transfer</h2>
      <div className="grid-form">
        <label>
          Source Branch
          <input value={sourceBranchLabel} readOnly />
        </label>
        <label>
          Destination Branch
          <select
            value={destinationBranchId}
            onChange={(e) => setDestinationBranchId(e.target.value)}
          >
            <option value="">Select destination</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.branchCode} - {b.branchName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
        </label>
      </div>

      <div className="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Product Code</th>
            <th>Product Name</th>
            <th>Quantity</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td>
                <input
                  value={row.productCode}
                  onChange={(e) => updateRow(index, "productCode", e.target.value)}
                  onBlur={() => handleProductCodeBlur(index)}
                />
              </td>
              <td>
                <textarea
                  value={row.productName}
                  onChange={(e) => updateRow(index, "productName", e.target.value)}
                  maxLength={150}
                  rows={2}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="1"
                  value={row.quantity}
                  onChange={(e) => updateRow(index, "quantity", e.target.value)}
                />
              </td>
              <td>
                <button type="button" onClick={() => removeRow(index)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div className="actions">
        <button type="button" onClick={addRow}>
          Add Product
        </button>
        <button type="button" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Transfer"}
        </button>
      </div>
      {message && <p className="message">{message}</p>}
    </section>
  );
}
