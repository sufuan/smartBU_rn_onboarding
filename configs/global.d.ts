// Onboarding slides for the app's welcome screens
type OnBoardingSlidesTypes = {
  color: string;
  image: any;
  title: string;
  secondTitle: string;
  subTitle: string;
};

// User details, including subscription and slot history
type UserType = {
  id: string;
  name: string;
  email: string;
  googleId?: string; // For Google Login
  phone_number?: string;
  avatar?: string;
  stripeCustomerId?: string; // For Stripe payments
  role: 'User' | 'Admin'; // Simplified roles
  pushToken?: string; // For push notifications
  verified: boolean;
  slots: SlotType[]; // Booked slots
  notifications: NotificationType[];
  tickets: TicketType[];
  createdAt: Date;
  updatedAt: Date;
};

// Washing machine details
type MachineType = {
  id: string;
  machineId: string; // e.g., "washer1"
  qrCode: string; // URL or data for permanent QR code (e.g., "machineId:washer1")
  status: 'Available' | 'InUse' | 'Offline'; // Machine status
  location?: string; // Optional, e.g., "Laundromat A"
  createdAt: Date;
  updatedAt: Date;
};

// 30-minute slot for machine usage
type SlotType = {
  id: string;
  userId: string;
  user: UserType;
  machineId: string;
  machine: MachineType;
  slotTime: Date; // Start time (e.g., 2025-06-17T10:00:00Z)
  duration: number; // Duration in milliseconds (e.g., 30 * 60 * 1000)
  authCode: string; // One-time auth code (e.g., "ABC123")
  status: 'Reserved' | 'Completed' | 'Cancelled';
  createdAt: Date;
  updatedAt: Date;
};

// Notification for slot status or issues
type NotificationType = {
  id: string;
  title: string;
  message: string;
  status: 'Unread' | 'Read';
  userId: string;
  user: UserType;
  redirect_link?: string; // Optional link to slot or ticket
  slotId?: string; // Link to slot (e.g., for "Cycle finished")
  ticketId?: string; // Link to ticket
  createdAt: Date;
  updatedAt: Date;
};

// Support ticket for machine issues
type TicketType = {
  id: string;
  creatorId: string;
  user: UserType;
  ticketTitle: string;
  details: string;
  status: 'Pending' | 'Resolved' | 'Closed';
  replies: TicketReplyType[];
  createdAt: Date;
  updatedAt: Date;
};

// Reply to a support ticket
type TicketReplyType = {
  id: string;
  ticketId: string;
  ticket: TicketType;
  reply: string;
  userId: string;
  user: UserType;
  createdAt: Date;
  updatedAt: Date;
};

// Usage log for auditing (e.g., proxy detection)
type UsageLogType = {
  id: string;
  userId: string;
  user: UserType;
  machineId: string;
  machine: MachineType;
  slotId: string;
  slot: SlotType;
  action: 'Booked' | 'Started' | 'Completed' | 'Cancelled';
  createdAt: Date;
};