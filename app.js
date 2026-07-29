(() => {
  "use strict";

  const config = window.CALENDAR_WIDGET_CONFIG || {};
  const calendarEl = document.getElementById("calendar");
  const statusEl = document.getElementById("status");
  const filtersEl = document.getElementById("category-filters");
  const titleEl = document.getElementById("calendar-title");
  const dialog = document.getElementById("event-dialog");
  const closeButton = document.getElementById("dialog-close");

  let calendar;
  let activeCategory = "All";
  const discoveredCategories = new Set();

  titleEl.textContent = config.calendarTitle || "Upcoming Events";

  function isConfigured() {
    return Boolean(
      config.googleCalendarId &&
      config.googleApiKey &&
      !String(config.googleCalendarId).startsWith("PASTE_") &&
      !String(config.googleApiKey).startsWith("PASTE_")
    );
  }

  function setStatus(message, type = "normal") {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", type === "error");
    statusEl.hidden = !message;
    requestParentResize();
  }

  function safeUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function parseDescription(rawDescription = "") {
    const metadata = {};
    const bodyLines = [];
    const metadataPattern = /^(CATEGORY|IMAGE|BUTTON|URL)\s*:\s*(.+)$/i;

    String(rawDescription)
      .replace(/\r\n/g, "\n")
      .split("\n")
      .forEach((line) => {
        const match = line.trim().match(metadataPattern);
        if (match) {
          metadata[match[1].toUpperCase()] = match[2].trim();
        } else {
          bodyLines.push(line);
        }
      });

    return {
      category: metadata.CATEGORY || "General",
      image: safeUrl(metadata.IMAGE),
      buttonText: metadata.BUTTON || "Learn more",
      buttonUrl: safeUrl(metadata.URL),
      description: bodyLines.join("\n").trim()
    };
  }

  function categoryColor(category) {
    return (
      config.categoryColors?.[category] ||
      config.fallbackCategoryColor ||
      "#334155"
    );
  }

  function transformGoogleEvent(item) {
    const parsed = parseDescription(item.description || "");
    discoveredCategories.add(parsed.category);

    const start = item.start?.dateTime || item.start?.date;
    const end = item.end?.dateTime || item.end?.date;
    const isAllDay = Boolean(item.start?.date);
    const color = categoryColor(parsed.category);

    return {
      id: item.id,
      title: item.summary || "Untitled event",
      start,
      end,
      allDay: isAllDay,
      url: item.htmlLink || "",
      backgroundColor: color,
      borderColor: color,
      extendedProps: {
        category: parsed.category,
        image: parsed.image,
        buttonText: parsed.buttonText,
        buttonUrl: parsed.buttonUrl,
        description: parsed.description,
        location: item.location || "",
        googleCalendarUrl: item.htmlLink || ""
      }
    };
  }

  async function fetchGoogleEvents(fetchInfo, successCallback, failureCallback) {
    setStatus("Loading events…");

    const params = new URLSearchParams({
      key: config.googleApiKey,
      singleEvents: "true",
      orderBy: "startTime",
      showDeleted: "false",
      maxResults: "2500",
      timeMin: fetchInfo.start.toISOString(),
      timeMax: fetchInfo.end.toISOString(),
      timeZone: config.timeZone || "America/Los_Angeles"
    });

    const calendarId = encodeURIComponent(config.googleCalendarId);
    let requestUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`;
    const items = [];

    try {
      while (requestUrl) {
        const response = await fetch(requestUrl);
        const data = await response.json();

        if (!response.ok) {
          const message = data?.error?.message || `Google Calendar returned ${response.status}.`;
          throw new Error(message);
        }

        items.push(...(data.items || []));

        if (data.nextPageToken) {
          const nextParams = new URLSearchParams(params);
          nextParams.set("pageToken", data.nextPageToken);
          requestUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${nextParams}`;
        } else {
          requestUrl = "";
        }
      }

      const events = items
        .filter((item) => item.status !== "cancelled")
        .map(transformGoogleEvent);

      renderCategoryFilters();
      setStatus(events.length ? "" : "No events are scheduled in this date range.");
      successCallback(events);
      requestParentResize();
    } catch (error) {
      console.error(error);
      const explanation =
        "Calendar events could not be loaded. Confirm that the calendar is public, the Calendar API is enabled, the Calendar ID is correct, and the API key allows this GitHub Pages address.";
      setStatus(`${explanation} Google says: ${error.message}`, "error");
      failureCallback(error);
    }
  }

  function renderCategoryFilters() {
    const categories = ["All", ...Array.from(discoveredCategories).sort()];
    filtersEl.replaceChildren();

    categories.forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-filter";
      button.textContent = category;
      button.classList.toggle("active", category === activeCategory);
      button.setAttribute("aria-pressed", String(category === activeCategory));
      button.addEventListener("click", () => {
        activeCategory = category;
        renderCategoryFilters();
        calendar?.rerenderEvents();
        requestParentResize();
      });
      filtersEl.appendChild(button);
    });
  }

  function formatEventDate(event) {
    const timeZone = config.timeZone || "America/Los_Angeles";
    const start = event.start;
    const end = event.end;

    if (!start) return "Date to be announced";

    if (event.allDay) {
      const dateFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      });

      if (end) {
        const inclusiveEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        const sameDate = start.toDateString() === inclusiveEnd.toDateString();
        if (!sameDate) {
          return `${dateFormatter.format(start)} – ${dateFormatter.format(inclusiveEnd)}`;
        }
      }
      return dateFormatter.format(start);
    }

    const dateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit"
    });

    if (!end) return `${dateFormatter.format(start)} at ${timeFormatter.format(start)}`;

    const sameDay = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(start) === new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(end);

    if (sameDay) {
      return `${dateFormatter.format(start)}, ${timeFormatter.format(start)}–${timeFormatter.format(end)}`;
    }

    return `${dateFormatter.format(start)} at ${timeFormatter.format(start)} – ${dateFormatter.format(end)} at ${timeFormatter.format(end)}`;
  }

  function setLink(element, url, label) {
    const validUrl = safeUrl(url);
    element.hidden = !validUrl;
    if (validUrl) {
      element.href = validUrl;
      if (label) element.textContent = label;
    } else {
      element.removeAttribute("href");
    }
  }

  function showEventDialog(event) {
    const props = event.extendedProps;
    document.getElementById("dialog-title").textContent = event.title;
    document.getElementById("dialog-date").textContent = formatEventDate(event);

    const categoryEl = document.getElementById("dialog-category");
    categoryEl.textContent = props.category || "General";
    categoryEl.hidden = !props.category;

    const locationEl = document.getElementById("dialog-location");
    locationEl.textContent = props.location ? `Location: ${props.location}` : "";
    locationEl.hidden = !props.location;

    const descriptionEl = document.getElementById("dialog-description");
    descriptionEl.textContent = props.description || "";
    descriptionEl.hidden = !props.description;

    const imageEl = document.getElementById("dialog-image");
    imageEl.hidden = !props.image;
    if (props.image) {
      imageEl.src = props.image;
      imageEl.alt = `${event.title} event image`;
    } else {
      imageEl.removeAttribute("src");
      imageEl.alt = "";
    }

    setLink(
      document.getElementById("dialog-primary-link"),
      props.buttonUrl,
      props.buttonText || "Learn more"
    );

    const directionsUrl = props.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(props.location)}`
      : "";
    setLink(document.getElementById("dialog-directions-link"), directionsUrl);
    setLink(document.getElementById("dialog-calendar-link"), props.googleCalendarUrl);

    dialog.showModal();
    requestParentResize();
  }

  function initialView() {
    return window.matchMedia("(max-width: 700px)").matches
      ? "listMonth"
      : "dayGridMonth";
  }

  function initializeCalendar() {
    if (!window.FullCalendar) {
      setStatus("FullCalendar did not load. Check your internet connection or CDN settings.", "error");
      return;
    }

    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: initialView(),
      timeZone: config.timeZone || "America/Los_Angeles",
      height: "auto",
      dayMaxEvents: true,
      nowIndicator: true,
      eventDisplay: "block",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,listMonth"
      },
      buttonText: {
        today: "Today",
        month: "Month",
        list: "List"
      },
      events: fetchGoogleEvents,
      eventClassNames(info) {
        const category = info.event.extendedProps.category || "General";
        return activeCategory === "All" || activeCategory === category
          ? []
          : ["calendar-event-hidden"];
      },
      eventClick(info) {
        info.jsEvent.preventDefault();
        showEventDialog(info.event);
      },
      datesSet() {
        requestParentResize();
      },
      eventDidMount() {
        requestParentResize();
      }
    });

    calendar.render();
  }

  function requestParentResize() {
    window.requestAnimationFrame(() => {
      const height = Math.ceil(document.documentElement.scrollHeight);
      window.parent.postMessage(
        { type: "calendar-widget-height", height },
        "*"
      );
    });
  }

  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", requestParentResize);

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(requestParentResize);
    observer.observe(document.body);
  }

  if (!isConfigured()) {
    setStatus(
      "Setup required: open config.js and paste your public Google Calendar ID and restricted Google API key.",
      "error"
    );
  } else {
    initializeCalendar();
  }
})();
