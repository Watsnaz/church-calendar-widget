# Squarespace Google Calendar Widget

This is a static, embeddable calendar widget for Squarespace. It reads public events from a dedicated Google Calendar, displays them with FullCalendar, and opens an accessible popup with event details.

## Files

- `index.html` — calendar page and event popup
- `styles.css` — appearance and responsive layout
- `app.js` — Google Calendar loading, filters, and popup behavior
- `config.js` — the only file you normally need to edit
- `.nojekyll` — tells GitHub Pages to publish the files as-is

## Event description format

Put optional metadata at the top of a Google Calendar event description:

```text
CATEGORY: Community
IMAGE: https://example.com/event-image.jpg
BUTTON: Register
URL: https://example.com/register

Join us for a free community event. Everyone is welcome!
```

Supported metadata:

- `CATEGORY:` controls the filter and event color.
- `IMAGE:` adds an image to the popup. Use a direct HTTPS image URL.
- `BUTTON:` sets the main popup button label.
- `URL:` sets the main popup button destination.

The remaining description becomes the popup body.

## Configuration

Edit `config.js` and replace:

- `PASTE_YOUR_GOOGLE_CALENDAR_ID_HERE`
- `PASTE_YOUR_RESTRICTED_GOOGLE_API_KEY_HERE`

You may also customize the title, time zone, categories, and colors.

## Recommended security model

This starter version is designed only for a **public website calendar**. The API key will be visible in browser source because GitHub Pages is static. That is acceptable only when:

1. The Google Calendar contains public information only.
2. The API key has an HTTP referrer restriction for your GitHub Pages domain.
3. The API key is restricted to the Google Calendar API.
4. Google Cloud quotas and usage alerts are enabled.

Never place private meetings, pastoral appointments, attendee lists, internal notes, or confidential information on the public calendar.

## GitHub Pages publication

1. Create a public GitHub repository.
2. Upload all files from this folder to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select the `main` branch and `/(root)` folder, then save.
6. GitHub will provide an address similar to:
   `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`

## Squarespace embed

Add a Code Block to the Squarespace page and paste this, replacing the URL:

```html
<iframe
  id="church-events-calendar"
  src="https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/"
  title="Church events calendar"
  loading="lazy"
  style="width:100%;height:900px;border:0;overflow:hidden;"
></iframe>

<script>
  (function () {
    var allowedOrigin = 'https://YOUR-USERNAME.github.io';

    window.addEventListener('message', function (event) {
      if (event.origin !== allowedOrigin) return;
      if (event.data && event.data.type === 'calendar-widget-height') {
        var frame = document.getElementById('church-events-calendar');
        if (frame) frame.style.height = Math.max(650, event.data.height) + 'px';
      }
    });
  })();
</script>
```

## Common errors

- **403 / API key not valid:** Calendar API is not enabled, key is wrong, or restrictions do not allow the GitHub Pages domain.
- **404 / Not Found:** Calendar ID is wrong or the calendar is not public.
- **Calendar loads but has no events:** Check event dates and ensure events were created on the public website calendar, not another calendar.
- **Images do not display:** Use an HTTPS direct image URL that permits third-party embedding.
- **Iframe is blank in Squarespace:** Confirm your Squarespace plan supports iframe/JavaScript Code Blocks and test the GitHub Pages URL directly first.
