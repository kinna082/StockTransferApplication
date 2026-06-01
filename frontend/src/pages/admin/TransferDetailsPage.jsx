import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { downloadTransferExcel, getStatuses, getTransferDetails, updateTransferStatus } from "../../services/api";

export default function TransferDetailsPage({ readOnly = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [message, setMessage] = useState("");
  const [statuses, setStatuses] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("");

  useEffect(() => {
    const detailsPromise = getTransferDetails(id);
    const load = readOnly
      ? detailsPromise.then((detailsData) => ({ detailsData, statusesData: [] }))
      : Promise.all([detailsPromise, getStatuses()]).then(([detailsData, statusesData]) => ({
          detailsData,
          statusesData
        }));

    load
      .then(({ detailsData, statusesData }) => {
        setDetails(detailsData);
        setStatuses(statusesData);
        setSelectedStatus(detailsData.status);
      })
      .catch(() => setMessage("Failed to load transfer details."));
  }, [id, readOnly]);

  const handleSaveStatus = async () => {
    try {
      await updateTransferStatus(id, selectedStatus);
      const refreshed = await getTransferDetails(id);
      setDetails(refreshed);
      setMessage("Status updated.");
    } catch (error) {
      setMessage(error.message || "Failed to update status.");
    }
  };

  if (message) return <p className="message">{message}</p>;
  if (!details) return <p>Loading details...</p>;

  return (
    <section>
      <h2>Transfer Details</h2>
      <div className="actions details-toolbar">
        <button type="button" onClick={() => navigate(-1)}>
          Back
        </button>
        {!readOnly && (
          <>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              {statuses.map((s) => (
                <option key={s.id} value={s.statusName}>
                  {s.statusName}
                </option>
              ))}
            </select>
            <button type="button" onClick={handleSaveStatus}>
              Save Status
            </button>
          </>
        )}
        <button type="button" onClick={() => downloadTransferExcel(id)}>
          Download Excel
        </button>
      </div>

      <p><strong>Transfer No:</strong> {details.transferNo}</p>
      <p><strong>Transfer Date:</strong> {details.transferDate}</p>
      <p><strong>Source Branch:</strong> {details.sourceBranchCode} - {details.sourceBranchName}</p>
      <p><strong>Destination Branch:</strong> {details.destinationBranchCode} - {details.destinationBranchName}</p>
      <p><strong>Status:</strong> {details.status}</p>

      <div className="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Transfer Date</th>
            <th>Product Code</th>
            <th>Product Name</th>
            <th>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {details.items.map((item, index) => (
            <tr key={`${item.productCode}-${index}`}>
              <td>{details.transferDate}</td>
              <td>{item.productCode}</td>
              <td>{item.productName}</td>
              <td>{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </section>
  );
}
