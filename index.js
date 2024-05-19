import axios from "axios";
import * as cheerio from "cheerio";
import fs from 'fs';

class Main {
	static async Run() {
		const App = new Main();

		console.log("Scraping ISFL Game History");
		let fullOutput = [];

		const finishedSeasons = 47;

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

	ParseGame = function(_index, _season, _row) {
		const tbody = _row.children[0];
		const awayTeamTable = tbody.children[1];
		const homeTeamTable = tbody.children[2];

		function GetGameCount(_season) {
			if (_season === 1) {
				return 3;
			}
			if (_season <= 15) {
				return 4;
			}
			if (_season <= 21) {
				return 5;
			}
			if (_season <= 24) {
				return 6;
			}
			return 7;
		}

		function ParseTeamName(_name) {
			switch (_name) {
				case 'Copperheads':
					return "AUS";
				case 'Outlaws':
					return "AZ";
				case 'Hahalua':
					return "HON";
				case 'Legion':
					return "LVL";
				case 'Second':
					return "NOLA";
				case 'Silverbacks':
					return "NYS";
				case 'Otters':
					return "OCO";
				case 'SaberCats':
					return "SJS";
				case 'Hawks':
					return "BAL";
				case 'Fire':
					return "BER";
				case 'Butchers':
					return "CHI";
				case 'Yeti':
					return "COL";
				case 'Crash':
					return "CTC";
				case 'Liberty':
					return "PHI";
				case 'Sailfish':
					return "SAR";
				case 'Wraiths':
					return "YKW";
			}
		}

		function ParseTeam(_score) {
			let teamName = _score.children[0].children[1].data.trim().split(' ')[0];

			if (teamName.length <= 0) {
				try {
					teamName = _score.children[0].children[2].children[0].data.trim().split(' ')[0]
				} catch (e) {
					console.log(e)
				}
			}

			return {
				team: ParseTeamName(teamName),
				first: parseInt(_score.children[1].children[0].data),
				second: parseInt(_score.children[2].children[0].data),
				third: parseInt(_score.children[3].children[0].data),
				fourth: parseInt(_score.children[4].children[0].data),
				overtime: _score.children.length === 7 ? parseInt(_score.children[5].children[0].data) : -1,
				final: _score.children.length === 7 ? parseInt(_score.children[6].children[0].data) : parseInt(_score.children[5].children[0].data),
			};
		}

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

		function ParseWeekNumber() {
			// S2 is fucked cause they didn't fix the scheduling yet
			if (_season === 2) {
				if(_index >= 16 && _index <= 47)
					return Math.ceil((_index + 1) / GetGameCount(_season)) - 4

				if(_index >= 48 && _index <= 66)
					return Math.ceil((_index + 2) / GetGameCount(_season)) - 4

				if(_index >= 67)
					return Math.ceil((_index + 3) / GetGameCount(_season)) - 4
			}

			return Math.ceil(_index / GetGameCount(_season)) - 5 < 0
				? Math.ceil(_index / GetGameCount(_season)) - 5
				: Math.ceil(_index / GetGameCount(_season)) - 4
		}

		return {
			season: _season,
			week: ParseWeekNumber(),
			away: homeLine.team,
			home: homeLine.team,
			winner: ParseWinner(),
			awayScore: awayLine.final,
			homeScore: homeLine.final,
			overtime: awayLine.overtime > 0 || homeLine.overtime > 0,
			awayDetails: awayLine,
			homeDetails: homeLine
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

		$('table').each((index, element) => {
			if ((index + 1) % 3 === 0) {
				const game = this.ParseGame((index + 1) / 3, _season, element);
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