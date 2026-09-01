const roundSubmissionModel = require("../models/roundSubmission.model");
const { destroyCloudinaryAsset } = require("../utils/uploads");
const { isHttpUrl } = require("../utils/validation");

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

  if (answers.length > 20 || fileKeys.length > 5 || uploadedFiles.length !== fileKeys.length) {
    throw submissionError("Submission contains too many fields or invalid attachments");
  }
  const cleanAnswers = answers.map((answer) => ({
    key: String(answer?.key || "").slice(0, 80),
    value: String(answer?.value || "").slice(0, 10000),
  }));
  if (new Set(cleanAnswers.map((answer) => answer.key)).size !== cleanAnswers.length) {
    throw submissionError("Each submission field can be answered only once");
  }
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
  const fieldsByKey = new Map(fields.map((field) => [String(field.key), field]));
  const unknownAnswer = cleanAnswers.find((answer) => !fieldsByKey.has(answer.key));
  if (unknownAnswer) throw submissionError("Submission contains an unknown field");
  const unknownFile = [...uploadedFields].find((key) => {
    const field = fieldsByKey.get(key);
    return !field || !["file", "pdf", "video"].includes(field.type);
  });
  if (unknownFile) throw submissionError("Submission contains an unexpected attachment");

  for (const answer of cleanAnswers) {
    const field = fieldsByKey.get(answer.key);
    const value = answer.value.trim();
    if (!value) continue;
    const maxLength = field.type === "long_text" ? 10000 : field.type === "text" ? 2000 : 2048;
    if (value.length > maxLength) throw submissionError(`${field.label} is too long`);
    if (field.type === "boolean" && !["true", "false"].includes(value)) {
      throw submissionError(`Choose a valid value for: ${field.label}`);
    }
    if (["url", "drive_link", "github"].includes(field.type) && !isHttpUrl(value)) {
      throw submissionError(`${field.label} must be a valid http(s) link`);
    }
    if (field.type === "github" && new URL(value).hostname.toLowerCase() !== "github.com") {
      throw submissionError(`${field.label} must be a GitHub link`);
    }
    if (field.type === "drive_link" && !["drive.google.com", "docs.google.com"].includes(new URL(value).hostname.toLowerCase())) {
      throw submissionError(`${field.label} must be a Google Drive link`);
    }
  }

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
