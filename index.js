import axios from "axios";
import * as cheerio from "cheerio";
import fs from 'fs';
import { ParseTeam, GetIndex, ParseWeekNumber } from "./utils.js";

class Main {
	static async Run() {
		const App = new Main();

		console.log("Scraping ISFL Game History");
		let fullOutput = [];

		const finishedSeasons = 51;

		for (let i = 1; i <= finishedSeasons; i++) {
			const seasonOutput = await App.Start(i);
			seasonOutput.forEach(game => {
				fullOutput.push(game);
			})
		}

		fs.writeFile(`./games/all_games.json`, JSON.stringify(fullOutput), 'utf8', function(err) {
			if (err) throw err;
			console.log(`JSON output complete: Full Output`);
		});
	}

	GetBoxScore(_season, _href) {
		if (_season <= 9) {
			return `https://index.sim-football.com/NSFLS0${_season}/${_href}`
		}
		if (_season <= 23) {
			return `https://index.sim-football.com/NSFLS${_season}/${_href}`
		}
		return `https://index.sim-football.com/ISFLS${_season}/${_href}`
	}

	ParseGame = function(_index, _season, _row, _link) {
		const tbody = _row.children[0];
		const awayTeamTable = tbody.children[1];
		const homeTeamTable = tbody.children[2];

		const homeLine = ParseTeam(homeTeamTable);
		const awayLine = ParseTeam(awayTeamTable);

		function ParseWinner() {
			if (homeLine.final === awayLine.final) {
				return "Tie";
			}

			if (homeLine.final > awayLine.final) {
				return homeLine.team;
			}

			return awayLine.team;
		}

		return {
			season: _season,
			week: ParseWeekNumber(_index, _season),
			winner: ParseWinner(),
			away: awayLine.team,
			home: homeLine.team,
			awayScore: awayLine.final,
			homeScore: homeLine.final,
			overtime: awayLine.overtime > 0 || homeLine.overtime > 0,
			awayDetails: awayLine,
			homeDetails: homeLine,
			boxScore: _link,
		};
	}



	async Start(_season){
		function GetIndex(_season) {
			if (_season <= 9) {
				return `https://index.sim-football.com/NSFLS0${_season}/GameResults.html`
			}
			if (_season <= 23) {
				return `https://index.sim-football.com/NSFLS${_season}/GameResults.html`
			}
			return `https://index.sim-football.com/ISFLS${_season}/GameResults.html`
		}

		const response = await axios.request({
			method: "GET",
			url: GetIndex(_season),
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
			}
		})

		const $ = cheerio.load(response.data);

		let jsonOutput = []

		$('table').each((index, element, link) => {
			if ((index + 1) % 3 === 0) {
				// Really janky way to navigate the tree to get the boxscore href
				const game = this.ParseGame((index + 1) / 3, _season, element, element.parent.parent.children[2].children[0].children[0].children[0].children[0].attribs.href);
				jsonOutput.push(game);
			}
		})

		// Denoting Finals, Conference Champs
		jsonOutput[jsonOutput.length - 1].week = "F"
		jsonOutput[jsonOutput.length - 2].week = "CC"
		jsonOutput[jsonOutput.length - 3].week = "CC"

		// Starting S16 we added a WC round and also a bye.
		// The splices are to remove the simmed bye games for more accurate data
		if (_season >= 16) {
			jsonOutput[jsonOutput.length - 4].week = "WC"
			jsonOutput[jsonOutput.length - 6].week = "WC"
			jsonOutput.splice(jsonOutput.length - 5, 1);
			jsonOutput.splice(jsonOutput.length - 6, 1);
		}


		fs.writeFile(`./games/s${_season}games.json`, JSON.stringify(jsonOutput), 'utf8', function(err) {
			if (err) throw err;
			console.log(`JSON output complete: S${_season}`);
		});

		return jsonOutput;
	}
}

Main.Run();