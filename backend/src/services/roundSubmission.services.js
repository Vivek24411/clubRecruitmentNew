const roundSubmissionModel = require("../models/roundSubmission.model");
const { destroyCloudinaryAsset } = require("../utils/uploads");

function submissionError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function prepareRoundSubmission({ round, answersJSON, fileKeysJSON, uploadedFiles = [], existing = null }) {
  let answers;
  let fileKeys;
  try {
    answers = JSON.parse(answersJSON || "[]");
    fileKeys = JSON.parse(fileKeysJSON || "[]");
    if (!Array.isArray(answers) || !Array.isArray(fileKeys)) throw new Error();
  } catch {
    throw submissionError("Submission data is invalid");
  }

  const cleanAnswers = answers.slice(0, 20).map((answer) => ({
    key: String(answer?.key || "").slice(0, 80),
    value: String(answer?.value || "").slice(0, 10000),
  }));
  const answerMap = new Map(cleanAnswers.map((answer) => [answer.key, answer.value.trim()]));
  const files = uploadedFiles.map((file, index) => ({
    fieldKey: String(fileKeys[index] || "attachment").slice(0, 80),
    publicId: file.filename,
    resourceType: file.resourceType || (file.mimetype?.startsWith("video/") ? "video" : file.mimetype === "application/pdf" ? "raw" : "image"),
    deliveryType: file.deliveryType || "authenticated",
    version: file.version || null,
    format: file.format || "",
    originalName: file.originalName || file.originalname || "",
    mimeType: file.mimetype || "",
    bytes: file.size || 0,
  }));
  const existingFilesByField = new Map((existing?.files || []).map((file) => [file.fieldKey, file]));
  const uploadedFields = new Set(files.map((file) => file.fieldKey));
  const fields = round.submissionFields || [];

  const invalidSelection = fields.find((field) => field.type === "select"
    && answerMap.get(field.key)
    && !(field.options || []).includes(answerMap.get(field.key)));
  if (invalidSelection) throw submissionError(`Choose a valid option for: ${invalidSelection.label}`);

  const missing = fields.find((field) => field.required && (
    ["file", "pdf", "video"].includes(field.type)
      ? !uploadedFields.has(field.key) && !existingFilesByField.has(field.key)
      : field.type === "boolean"
        ? answerMap.get(field.key) !== "true"
        : !answerMap.get(field.key)
  ));
  if (missing) throw submissionError(`Complete required field: ${missing.label}`);

  return { cleanAnswers, files, uploadedFields };
}

async function saveRoundSubmission({ event, round, candidate, studentId, answersJSON, fileKeysJSON, uploadedFiles = [], prepared = null }) {
  const existing = await roundSubmissionModel.findOne({ candidateId: candidate._id });
  if (existing && !round.allowResubmission) throw submissionError("This round allows only one submission", 409);

  const submissionData = prepared || prepareRoundSubmission({
    round,
    answersJSON,
    fileKeysJSON,
    uploadedFiles,
    existing,
  });
  const retainedFiles = (existing?.files || []).filter((file) => !submissionData.uploadedFields.has(file.fieldKey));
  const now = new Date();
  const submission = await roundSubmissionModel.findOneAndUpdate(
    { candidateId: candidate._id },
    {
      eventId: event._id,
      roundId: round._id,
      registrationId: candidate.registrationId,
      candidateId: candidate._id,
      submittedBy: studentId,
      answers: submissionData.cleanAnswers,
      files: [...retainedFiles.map((file) => file.toObject ? file.toObject() : file), ...submissionData.files],
      revision: (existing?.revision || 0) + 1,
      status: "submitted",
      submittedAt: now,
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  const replaced = (existing?.files || []).filter((file) => submissionData.uploadedFields.has(file.fieldKey));
  await Promise.all(replaced.map((file) => destroyCloudinaryAsset(file.publicId, file.resourceType, file.deliveryType)));
  candidate.status = "submitted";
  await candidate.save();
  return { submission, existing: Boolean(existing) };
}

module.exports = { prepareRoundSubmission, saveRoundSubmission, submissionError };
