window.CALENDAR_WIDGET_CONFIG = {
  // Paste the Calendar ID from Google Calendar > Settings > Integrate calendar.
  googleCalendarId: "PASTE_YOUR_GOOGLE_CALENDAR_ID_HERE",

  // Paste the restricted Google API key from Google Cloud Console.
  googleApiKey: "PASTE_YOUR_RESTRICTED_GOOGLE_API_KEY_HERE",

  // Use an IANA time zone name. Watsonville is America/Los_Angeles.
  timeZone: "America/Los_Angeles",

  calendarTitle: "Upcoming Events",

  // Category names are read from CATEGORY: in each event description.
  categoryColors: {
    "Worship": "#4f46e5",
    "Kids": "#0f766e",
    "Community": "#b45309",
    "Classes": "#be123c",
    "Youth": "#7e22ce"
  },

  fallbackCategoryColor: "#334155",
  monthsBack: 1,
  monthsForward: 18
};
