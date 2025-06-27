import axios from "axios";

const API_BASE_URL = "https://cafm.zenapi.co.in/api/attendance/regularization-history";

export async function fetchAllRegularizations() {
  const res = await axios.get(`${API_BASE_URL}/all`);
  return res.data;
}

export async function updateRegularizationStatus(id: string, action: string, rejectionReason?: string) {
  if (action === "approve") {
    // Use the new approve API and body
    return axios.patch(
      `https://cafm.zenapi.co.in/api/attendance/regularize/${id}/approve`,
      {
        status: "Approved",
        approvedBy: "Manager"
      }
    );
  } else if (action === "reject") {
    // Use the new reject API and body
    return axios.patch(
      `https://cafm.zenapi.co.in/api/attendance/regularize/${id}/reject`,
      {
        status: "Rejected",
        rejectionReason: rejectionReason || "Reason for rejection"
      }
    );
  }
}
