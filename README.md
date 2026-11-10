# Workday Calendar

A small browser calendar for planning your work year. Set a weekly pattern or alternate Week A and Week B for a biweekly rotation, then browse the 12-month calendar with the left and right arrows. Each click shifts the displayed year-long window by one month. Workdays are gold, days off are green, Canada-wide federal and provincial holidays have black dots, Ontario-only holidays have red dots, and Québec-only holidays have blue dots. Select any calendar date to adjust its hours without changing the recurring pattern.

## Run it locally

1. Open this folder in Visual Studio Code.
2. Open `index.html` in your browser. For the smoothest experience, serve the folder with the VS Code **Live Server** extension.
3. Choose **Every week** or **Every 2 weeks**. For a biweekly pattern, enter hours for both weeks and choose the Monday that starts Week A.
4. Choose a calendar year and select **Save schedule**. Click a work-hour field to select its current value, then type the replacement.

This is a static HTML, CSS, and JavaScript app. There is no build step, backend, account, or dependency to install.

## Holidays and privacy

- The app fetches Canadian public holidays for the selected year from the [Nager.Date API](https://date.nager.at/). Canada-wide holidays are shown in black; Ontario (`CA-ON`) and Québec (`CA-QC`) exclusive dates use red and blue respectively. It refreshes when the year changes or the page is opened.
- If the service cannot be reached, the app uses the last successful holiday response saved in this browser. Holiday coverage and whether a day is observed can vary by employer and employment status; use your employer’s calendar for payroll or leave decisions.
- Your weekly or biweekly pattern and date adjustments are saved in this browser’s local storage when you select **Save schedule**. Each save replaces the previous saved schedule; individual date edits save immediately. They are not uploaded to GitHub or sent to a server. **Download backup** downloads a JSON copy; **Import schedule** restores one. Downloaded backups are separate files and your browser may add a number if a file with that name already exists.
- Clearing browser storage removes the saved schedule. Keep an export if you want a backup.

## Future improvements

- Add French and English language switching.
- Add repeating shift patterns longer than one week.
- Add calendar file export (`.ics`) and print-friendly views.
- Let the user choose which federal, provincial, and employer holidays appear.
- Add a configurable holiday source or an offline holiday pack.

## Data sources

- [Nager.Date public holiday API](https://date.nager.at/)
- [Government of Canada: General holidays for federally regulated employees](https://www.canada.ca/en/services/jobs/workplace/federal-labour-standards/vacations-holidays.html)
- [Government of Québec: Public service holidays](https://www.quebec.ca/gouvernement/travailler-gouvernement/remuneration-avantages-sociaux/conditions-travail/jours-feries)

