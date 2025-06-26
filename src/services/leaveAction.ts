import { api } from "./api";

export const updateLeaveStatus = async (
  leaveId: string,
  status: "Approved" | "Rejected",
  rejectionReason?: string
) => {
  const payload: { status: "Approved" | "Rejected"; rejectionReason?: string } = { status };
  if (status === "Rejected" && rejectionReason) {
    payload.rejectionReason = rejectionReason;
  }
  const response = await api.put(`/leave/update/${leaveId}`, payload);
  return response.data;
};
