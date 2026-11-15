// "Add to calendar": makes a .ics file that opens in Google/Apple/Outlook calendars. Free, no account.
const pad = (n) => String(n).padStart(2, "0");
const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const esc = (s) => String(s || "").replace(/[\\;,]/g, (m) => "\\" + m).replace(/\n/g, "\\n");

// events: [{ title, start: Date, minutes, location, notes }]
export function downloadIcs(filename, events) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fyndo//EN", "CALSCALE:GREGORIAN"];
  events.forEach((e, i) => {
    const end = new Date(e.start.getTime() + (e.minutes || 90) * 60000);
    lines.push("BEGIN:VEVENT", `UID:fyndo-${Date.now()}-${i}@fyndo`, `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(e.start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${esc(e.title)}`,
      `LOCATION:${esc(e.location)}`, `DESCRIPTION:${esc(e.notes)}`,
      "BEGIN:VALARM", "TRIGGER:-PT60M", "ACTION:DISPLAY", "DESCRIPTION:Fyndo reminder", "END:VALARM", "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export const atDateTime = (iso, hhmm) => new Date(`${iso}T${hhmm}:00`);
