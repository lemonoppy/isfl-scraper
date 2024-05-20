# isfl-scraper

Scraper for ISFL games from the index. You can just use `npm start` to get it to start, output is in `games/XYZ`.

I used a linter to prettify the output but if you want to just import it to use data transformations, not necessary.

## Notes

S2 is kinda fucked, so there's some exception handling there (notably they have byes in season which makes it kinda funky)

Week numbers are done so Preseason Week 1 maps to -4 in the output, Week 2 to -3, and so on

Data also starts at 1 for weeks, no 0 indexing here

Uhhhhh, no other notes other than Ultimus Bowl Finals is denoted as F, Conference Champs as CC, Wildcard as WC

Wildcard byes are removed from the data set as they pollute it.

If Overtime in a team details is -1, it means they did not play OT, kinda self-explanatory I guess?
