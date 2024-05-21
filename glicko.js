import axios from "axios";
import * as cheerio from "cheerio";
import * as glicko2 from 'glicko2';
import {GetIndex, ParseTeam, ParseWeekNumber, TEAM_ABV_MODERN} from "./utils.js";
import fs from "fs";

const GLICKO_SETTINGS = {
	tau: 0.5,
	rating: 1500,
	rd: 200,
	vol: 0.06
};
const glicko = new glicko2.Glicko2(GLICKO_SETTINGS);

const fromSeason = 1;
const toSeason = 47;

const PLAYERS = {};

const getPlayer = (name) => {
	if (!PLAYERS[name]) {
		PLAYERS[name] = glicko.makePlayer();
	}

	return PLAYERS[name];
};

const HISTORY = [];

class Main {
	static async Run() {
		const App = new Main();

		console.log("Generating ISFL Glicko Game History");

		for (let season = fromSeason; season <= toSeason; season++) {
			const seasonResult = await App.Start(season);

			const output = {
				season: season,
			}

			TEAM_ABV_MODERN.forEach(team => {
				if (seasonResult[team]) {
					output[team] = seasonResult[team].getRating();
				}
				else {
					output[team] = -1;
				}
			})

			HISTORY.push(output)
		}

		fs.writeFile(`./games/glicko_data.json`, JSON.stringify(HISTORY), 'utf8', function(err) {
			if (err) throw err;
			console.log(`JSON output complete: Glicko Data`);
		});
	}

	ParseGame = function(_index, _season, _row) {
		const tbody = _row.children[0];
		const awayTeamTable = tbody.children[1];
		const homeTeamTable = tbody.children[2];

		const homeLine = ParseTeam(homeTeamTable, true);
		const awayLine = ParseTeam(awayTeamTable, true);

		function ParseWinner() {
			if (homeLine.final === awayLine.final) {
				return 0.5;
			}

			if (homeLine.final > awayLine.final) {
				return 0;
			}

			return 1;
		}

		if (ParseWeekNumber(_index, _season) > 0)
			return [
				getPlayer(awayLine.team), getPlayer(homeLine.team), ParseWinner()
			];

		return null;
	}



	async Start(_season){
		const response = await axios.request({
			method: "GET",
			url: GetIndex(_season),
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
			}
		})

		const $ = cheerio.load(response.data);

		let matches = []

		$('table').each((index, element) => {
			if ((index + 1) % 3 === 0) {
				const game = this.ParseGame((index + 1) / 3, _season, element);
				if (game)
					matches.push(game);
			}
		})

		if (_season >= 16) {
			matches.splice(matches.length - 5, 1);
			matches.splice(matches.length - 6, 1);
		}

		glicko.updateRatings(matches);

		const seasonResults = {
			season: _season,
		}

		TEAM_ABV_MODERN.forEach(team => {
			seasonResults[team] = getPlayer(team);
		})

		return seasonResults
	}
}

Main.Run();