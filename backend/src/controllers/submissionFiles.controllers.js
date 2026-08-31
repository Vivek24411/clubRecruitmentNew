const eventModel = require("../models/event.model");
const roundCandidateModel = require("../models/roundCandidate.model");
const roundSubmissionModel = require("../models/roundSubmission.model");
const { signedDownloadUrl } = require("../services/submissionFiles.services");

function requestedFile(submission, indexValue) {
  const index = Number(indexValue);
  if (!Number.isInteger(index) || index < 0) return null;
  return submission?.files?.[index] || null;
}

async function sendDownload(submission, indexValue, res) {
  const file = requestedFile(submission, indexValue);
  if (!file) return res.status(404).json({ success: false, msg: "Submission file not found" });
  return res.json({
    success: true,
    download: signedDownloadUrl(file),
    file: { originalName: file.originalName, mimeType: file.mimeType, bytes: file.bytes },
  });
}

module.exports.studentSubmissionDownload = async (req, res) => {
  const submission = await roundSubmissionModel.findById(req.params.submissionId);
  if (!submission) return res.status(404).json({ success: false, msg: "Submission file not found" });
  const candidate = await roundCandidateModel.exists({
    _id: submission.candidateId,
    participantIds: req.student._id,
  });
  if (!candidate) return res.status(403).json({ success: false, msg: "You cannot access this submission" });
  return sendDownload(submission, req.params.fileIndex, res);
};

module.exports.clubSubmissionDownload = async (req, res) => {
  const submission = await roundSubmissionModel.findById(req.params.submissionId);
  if (!submission) return res.status(404).json({ success: false, msg: "Submission file not found" });
  const ownsEvent = await eventModel.exists({ _id: submission.eventId, clubId: req.club._id });
  if (!ownsEvent) return res.status(403).json({ success: false, msg: "You cannot access this submission" });
  return sendDownload(submission, req.params.fileIndex, res);
};
