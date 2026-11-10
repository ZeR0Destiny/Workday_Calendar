# Workday Calendar

A small browser calendar for planning your work year. Set a weekly pattern or alternate Week A and Week B for a biweekly rotation, then browse the 12-month calendar with the left and right arrows. Each click shifts the displayed year-long window by one month. Workdays are gold, days off are green, federal general holidays (including dates shared with Québec) have black dots, Québec-only statutory holidays have blue dots, and Ontario-only public holidays have red dots. Select any calendar date to adjust its hours without changing the recurring pattern.

## Run it locally

1. Open this folder in Visual Studio Code.
2. Open `index.html` in your browser. For the smoothest experience, serve the folder with the VS Code **Live Server** extension.
3. Choose **Every week** or **Every 2 weeks**. For a biweekly pattern, enter hours for both weeks and choose the Monday that starts Week A.
4. Choose a calendar year and select **Save schedule**. Click a work-hour field to select its current value, then type the replacement.

This is a static HTML, CSS, and JavaScript app. There is no build step, backend, account, or dependency to install.

## Holidays and privacy

- Federal general holidays are calculated from the Canada Labour Code list: New Year’s Day, Good Friday, Victoria Day, Canada Day, Labour Day, National Day for Truth and Reconciliation, Thanksgiving, Remembrance Day, Christmas Day, and Boxing Day.
- Québec statutory dates are calculated from CNESST rules: New Year’s Day; Good Friday or Easter Monday (the employer chooses one); National Patriots’ Day; Québec’s National Holiday; Canada Day; Labour Day; Thanksgiving; and Christmas Day. The calendar marks both Good Friday and Easter Monday as alternatives. It also marks the conditional June 25 observance when June 24 falls on a Sunday, and July 2 for Québec when July 1 falls on a Sunday.
- Ontario-only public holidays are fetched from the [Nager.Date API](https://date.nager.at/) and cached in the browser. If the service is unavailable, the last successful Ontario data is used; federal and Québec dates continue to be calculated locally.
- Holiday dots show statutory dates, but employers may arrange substitute days when a holiday lands on a non-work day. Use your employer’s calendar for your exact paid days off.
- Your weekly or biweekly pattern and date adjustments are saved in this browser’s local storage when you select **Save schedule**. Each save replaces the previous saved schedule; individual date edits save immediately. They are not uploaded to GitHub or sent to a server. **Download backup** downloads a JSON copy; **Import schedule** restores one. Downloaded backups are separate files and your browser may add a number if a file with that name already exists.
- Clearing browser storage removes the saved schedule. Keep an export if you want a backup.

## Future improvements

- Add French and English language switching.
- Add repeating shift patterns longer than one week.
- Add calendar file export (`.ics`) and print-friendly views.
- Let the user choose which federal, provincial, and employer holidays appear.
- Add a configurable holiday source or an offline holiday pack.

## Data sources

- [Government of Canada: General holidays for federally regulated employees](https://www.canada.ca/en/services/jobs/workplace/federal-labour-standards/vacations-holidays.html)
- [CNESST: Québec statutory holidays](https://www.cnesst.gouv.qc.ca/en/working-conditions/leave/statutory-holidays/statutory-holidays)
- [Nager.Date API](https://date.nager.at/)

