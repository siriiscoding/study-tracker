# Study Tracker

A small installable study tracker PWA. It stores logs and goals in the browser on your device.

## Run Locally

```sh
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173
```

## Install On Your Phone

For real phone installation, host this folder on an HTTPS static host such as GitHub Pages, Netlify, Cloudflare Pages, or Vercel.

On iPhone:

1. Open the HTTPS app URL in Safari.
2. Tap Share.
3. Tap Add to Home Screen.

On Android:

1. Open the HTTPS app URL in Chrome.
2. Tap the browser menu.
3. Tap Install app or Add to Home screen.

## Features

- Log minutes, end time, subject, topic, and mode of learning.
- Automatically calculates the start time from minutes and end time.
- Start a timer when you begin studying or reading, then use the elapsed time in a log.
- Shows recent sessions, calendar totals, seven-day bar graph, subject and topic breakdowns, daily/weekly/monthly goals, streak, and all-time total.
- Tracks current and best study/reading streaks based on any day with logged time.
- Shows a celebration when the highlighted goal is complete.
- Works offline after the first successful HTTPS load.
