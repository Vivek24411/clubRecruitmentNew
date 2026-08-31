export type MongoId = string;

export type StudentSummary = {
  _id: MongoId;
  name: string;
  email?: string;
  profilePicture?: string;
};

export type Club = {
  _id: MongoId;
  name: string;
  category?: string;
  shortDescription?: string;
  longDescription?: string;
  achivements?: string;
  recruitmentMethods?: string;
  clubLogo?: string;
  clubBanner?: string;
  website?: string;
  linkedin?: string;
  instagram?: string;
  contactEmail?: string;
  contactPhone?: string;
  resources?: { _id?: MongoId; title: string; description?: string; url: string; type?: string }[];
  annualEvents?: { _id?: MongoId; name: string; description?: string; tentativeDate?: string }[];
};

export type EventRound = {
  _id: MongoId;
  order: number;
  title: string;
  type: string;
  customType?: string;
  description?: string;
  instructions?: string;
  evaluationScope?: 'application' | 'participant';
  interviewMode?: 'group' | 'individual' | null;
  scheduleMode?: 'none' | 'common' | 'slots';
  startsAt?: string | null;
  endsAt?: string | null;
  venue?: string;
  meetingUrl?: string;
  submissionEnabled?: boolean;
  submissionOpensAt?: string | null;
  submissionDeadlineAt?: string | null;
  allowResubmission?: boolean;
  submissionFields?: {
    key: string;
    label: string;
    type: 'text' | 'short_text' | 'long_text' | 'boolean' | 'select' | 'url' | 'drive_link' | 'github' | 'file' | 'pdf' | 'video';
    required?: boolean;
    helpText?: string;
    options?: string[];
  }[];
};

export type EventVertical = {
  _id: MongoId;
  title: string;
  shortDescription?: string;
  description?: string;
  problemStatementUrl?: string;
  status?: 'open' | 'closed';
  registrationType?: 'individual' | 'team' | 'optional_team';
  minTeamSize?: number;
  maxTeamSize?: number;
  rounds?: EventRound[];
  deadlineAt?: string | null;
  registrationDeadlineAt?: string | null;
  show?: 0 | 1 | 2 | 3;
  canApply?: boolean;
  eligible?: boolean;
  eligibilityReason?: string;
  blockedReason?: string;
  detail?: {
    _id: MongoId;
    teamName?: string | null;
    overallStatus?: string;
    studentOverallStatus?: string;
    studentId?: StudentSummary;
    membersAccepted?: StudentSummary[];
    membersOffered?: StudentSummary[];
    registeredAt?: string;
  } | null;
  invitations?: { _id: MongoId; teamName?: string | null; studentId?: StudentSummary; membersAccepted?: StudentSummary[] }[];
};

export type DiscovrEvent = {
  _id: MongoId;
  title: string;
  shortDescription?: string;
  longDescription?: string;
  problemStatementUrl?: string;
  eventType?: string;
  eventBanner?: string;
  status?: string;
  clubId?: Club;
  registrationDeadlineAt?: string | null;
  registerationDeadline?: string;
  registrationType?: 'individual' | 'team' | 'optional_team';
  minTeamSize?: number;
  maxTeamSize?: number;
  eligibility?: string;
  numberOfRounds?: number;
  rounds?: EventRound[];
  verticals?: EventVertical[];
  verticalsEnabled?: boolean;
  maxVerticalApplications?: number | null;
  hasApplied?: boolean;
  application?: { registrationId?: MongoId; role?: string; overallStatus?: string } | null;
  applications?: { registrationId?: MongoId; verticalId?: MongoId; role?: string; overallStatus?: string }[];
  publishedAt?: string;
  createdAt?: string;
};

export type Session = {
  _id: MongoId;
  title: string;
  shortDescription?: string;
  longDescription?: string;
  date?: string;
  time?: string;
  duration?: number | string;
  venue?: string;
  meetingUrl?: string;
  capacity?: number | null;
  confirmedRsvpCount?: number;
  status?: string;
  sessionThumbnail?: string;
  clubId?: Club;
  createdAt?: string;
  updatedAt?: string;
};

export type SessionRsvp = {
  _id: MongoId;
  status: 'confirmed' | 'waitlisted' | 'cancelled';
};

export type Student = {
  _id: MongoId;
  name: string;
  email: string;
  programme?: string;
  branch?: string;
  year?: string;
  academicYear?: number;
  academicStatus?: string;
  enrollmentNumber?: string;
  phoneNumber?: string;
  profilePicture?: string;
  notificationPreferences?: { email?: boolean; inApp?: boolean };
};

export type Notification = {
  _id: MongoId;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export type EventRegistration = {
  _id: MongoId;
  eventId: DiscovrEvent;
  verticalId?: MongoId;
  studentId?: StudentSummary;
  membersAccepted?: StudentSummary[];
  membersOffered?: StudentSummary[];
  teamName?: string | null;
  overallStatus?: string;
  studentOverallStatus?: string;
  registeredAt?: string;
  currentRound?: number;
  numberOfRounds?: number;
  workflow?: {
    candidates: RoundCandidate[];
    slots: ScheduleSlot[];
    studentOverallStatus?: string;
  };
};

export type RoundCandidate = {
  _id: MongoId;
  roundId: MongoId;
  registrationId: MongoId;
  scope: 'application' | 'participant';
  status: string;
  studentId?: StudentSummary;
  participantIds?: StudentSummary[];
  canAct?: boolean;
  isMine?: boolean;
  score?: number | null;
  notes?: string | null;
};

export type SubmissionFile = {
  fieldKey: string;
  downloadPath: string;
  publicId: string;
  resourceType: 'image' | 'video' | 'raw';
  originalName?: string;
  mimeType?: string;
  bytes?: number;
};

export type RoundSubmission = {
  _id: MongoId;
  candidateId: MongoId;
  answers?: { key: string; value: string }[];
  files?: SubmissionFile[];
  revision?: number;
  status?: string;
  submittedAt?: string;
};

export type ScheduleSlot = {
  _id: MongoId;
  candidateId: MongoId;
  startAt: string;
  endAt?: string;
  venue?: string;
  meetingUrl?: string;
  status?: string;
};

export type WorkflowApplication = {
  verticalId: MongoId;
  verticalTitle: string;
  registration: EventRegistration;
  studentOverallStatus?: string;
  candidates: RoundCandidate[];
  submissions: RoundSubmission[];
  slots: ScheduleSlot[];
};

export type EventWorkflowResponse = {
  success: boolean;
  event: DiscovrEvent;
  applications: WorkflowApplication[];
};

export type MyApplication = {
  _id: MongoId;
  role: 'captain' | 'member';
  joinedAt?: string;
  verticalTitle?: string;
  verticalsEnabled?: boolean;
  history?: boolean;
  reason?: string;
  registrationId?: EventRegistration;
};

export type DashboardResponse = {
  success: boolean;
  events: DiscovrEvent[];
  sessions: Session[];
  settings?: { maintenanceMessage?: string };
};
