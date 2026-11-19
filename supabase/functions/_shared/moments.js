defaultMaxOversPerBowler(12);
/** Super over: one over, ends after two wickets. */
var SUPER_OVER = {
	overs: 1,
	wickets: 2
};
/** Default bowling quota: one fifth of the overs, rounded up. */
function defaultMaxOversPerBowler(overs) {
	return Math.max(1, Math.ceil(overs / 5));
}
/** Wides and no-balls are not legal deliveries. */
function isLegal(extra) {
	return extra !== "wide" && extra !== "noBall";
}
/** Dismissals that credit the bowler with a wicket. */
function creditsBowler(kind) {
	return kind !== "runOut" && kind !== "retiredOut";
}
/**
* Which team bats in innings `index`. Main innings follow the toss. In a
* super over the team that batted second in the previous pair bats first.
*/
function battingTeamFor(index, toss, previous = []) {
	const firstBatting = toss.decision === "bat" ? toss.winner : 1 - toss.winner;
	if (index === 0) return firstBatting;
	if (index === 1) return 1 - firstBatting;
	const prev = previous[index - 1]?.battingTeam ?? 1 - firstBatting;
	return index % 2 === 0 ? prev : 1 - prev;
}
/** Wickets that end the innings. */
function maxWickets(team, settings) {
	const n = team.players.length;
	return settings.lastManStands ? n : n - 1;
}
function ballRuns(ball, settings) {
	const r = {
		total: 0,
		batter: 0,
		conceded: 0,
		wides: 0,
		noBalls: 0,
		byes: 0,
		legByes: 0
	};
	switch (ball.extra) {
		case null:
			r.batter = ball.runs;
			r.conceded = ball.runs;
			break;
		case "wide":
			r.wides = settings.wideRuns + ball.runs;
			r.conceded = r.wides;
			break;
		case "noBall":
			r.noBalls = settings.noBallRuns;
			r.batter = ball.runs;
			r.conceded = settings.noBallRuns + ball.runs;
			break;
		case "bye":
			r.byes = ball.runs;
			break;
		case "legBye": r.legByes = ball.runs;
	}
	r.total = r.batter + r.wides + r.noBalls + r.byes + r.legByes;
	return r;
}
/** Batters of the batting team who can still come in. */
function availableBatters(innings, team) {
	const atCrease = /* @__PURE__ */ new Set([innings.strikerId, innings.nonStrikerId]);
	return team.players.map((p) => p.id).filter((id) => {
		if (atCrease.has(id)) return false;
		const b = innings.batters.find((x) => x.playerId === id);
		if (!b) return true;
		return b.dismissal === null && b.retiredHurt;
	});
}
// src/engine/result.ts
/** Result of one pair of innings (the main match, or one super over). */
function pairResult(first, second) {
	if (second.target !== null && second.runs >= second.target) return {
		kind: "won",
		winner: second.battingTeam,
		by: "wickets",
		margin: second.wicketsLimit - second.wickets
	};
	if (second.runs === first.runs) return { kind: "tie" };
	return {
		kind: "won",
		winner: first.battingTeam,
		by: "runs",
		margin: first.runs - second.runs
	};
}
/**
* Result of a completed match. A tied main match is decided by the last
* completed super over, if one was played.
*/
function computeResult(innings) {
	const main = pairResult(innings[0], innings[1]);
	if (main.kind !== "tie" || innings.length < 4) return main;
	const n = innings.length - innings.length % 2;
	const so = pairResult(innings[n - 2], innings[n - 1]);
	return so.kind === "won" ? {
		kind: "won",
		winner: so.winner,
		by: "superOver",
		margin: 0
	} : so;
}
// src/engine/scoring.ts
/**
* Replays every event of the match and returns the derived state.
* Pure function: same events in, same state out.
*/
function deriveMatchState(match) {
	const innings = [];
	let cur = null;
	let over = {
		conceded: 0,
		bowlerChanged: false
	};
	const perTeam = match.settings.reviewsPerTeam ?? 0;
	const reviewsLeft = perTeam > 0 ? [perTeam, perTeam] : null;
	const reviews = [];
	for (const ev of match.events) {
		if (ev.type === "inningsStart") {
			if (cur && !cur.ended) continue;
			cur = createInnings(innings.length, match, innings);
			innings.push(cur);
			addBatter(cur, ev.strikerId);
			addBatter(cur, ev.nonStrikerId);
			cur.strikerId = ev.strikerId;
			cur.nonStrikerId = ev.nonStrikerId;
			startPartnership(cur);
			setBowler(cur, ev.bowlerId);
			cur.overs.push({
				number: 1,
				bowlerId: ev.bowlerId,
				balls: [],
				runs: 0
			});
			over = {
				conceded: 0,
				bowlerChanged: false
			};
			continue;
		}
		if (!cur || cur.ended) continue;
		switch (ev.type) {
			case "ball":
				applyBall(cur, ev, match, over);
				break;
			case "newBatter":
				addBatter(cur, ev.batterId);
				if (cur.strikerId === null) cur.strikerId = ev.batterId;
				else cur.nonStrikerId = ev.batterId;
				startPartnership(cur);
				break;
			case "newBowler":
				if (cur.bowlerId === null) {
					cur.overs.push({
						number: cur.overs.length + 1,
						bowlerId: ev.bowlerId,
						balls: [],
						runs: 0
					});
					over = {
						conceded: 0,
						bowlerChanged: false
					};
				} else over.bowlerChanged = true;
				setBowler(cur, ev.bowlerId);
				break;
			case "retire":
				applyRetire(cur, ev, match);
				break;
			case "swapStrike":
				swapEnds(cur);
				break;
			case "penalty":
				cur.runs += ev.runs;
				cur.penaltyRuns += ev.runs;
				break;
			case "review":
				reviews.push({
					team: ev.team,
					successful: ev.successful,
					inningsIndex: cur.index,
					legalBalls: cur.legalBalls
				});
				if (reviewsLeft && !ev.successful) reviewsLeft[ev.team] = Math.max(0, reviewsLeft[ev.team] - 1);
				break;
			case "endInnings":
				cur.ended = true;
				cur.endReason = "manual";
		}
		checkInningsEnd(cur, match);
	}
	const phase = computePhase(innings, match);
	const result = phase === "completed" ? computeResult(innings) : null;
	return {
		innings,
		current: cur,
		phase,
		result,
		reviewsLeft,
		reviews
	};
}
function createInnings(index, match, previous) {
	const battingTeam = battingTeamFor(index, match.toss, previous);
	const superOver = index >= 2;
	const allOut = maxWickets(match.teams[battingTeam], match.settings);
	const chasing = index % 2 === 1 ? previous[index - 1] : void 0;
	return {
		index,
		superOver,
		oversLimit: superOver ? SUPER_OVER.overs : match.settings.overs,
		wicketsLimit: superOver ? Math.min(SUPER_OVER.wickets, allOut) : allOut,
		penaltyRuns: 0,
		battingTeam,
		bowlingTeam: battingTeam === 0 ? 1 : 0,
		runs: 0,
		wickets: 0,
		legalBalls: 0,
		extras: {
			wides: 0,
			noBalls: 0,
			byes: 0,
			legByes: 0
		},
		batters: [],
		bowlers: [],
		fallOfWickets: [],
		partnerships: [],
		overs: [],
		strikerId: null,
		nonStrikerId: null,
		loneBatter: false,
		bowlerId: null,
		previousOverBowlerId: null,
		freeHitNext: false,
		target: chasing ? chasing.runs + 1 : null,
		ended: false,
		endReason: null
	};
}
function addBatter(inn, playerId) {
	const existing = inn.batters.find((b) => b.playerId === playerId);
	if (existing) {
		existing.retiredHurt = false;
		return existing;
	}
	const stats = {
		playerId,
		order: inn.batters.length,
		runs: 0,
		balls: 0,
		fours: 0,
		sixes: 0,
		dismissal: null,
		retiredHurt: false
	};
	inn.batters.push(stats);
	return stats;
}
function setBowler(inn, playerId) {
	inn.bowlerId = playerId;
	let stats = inn.bowlers.find((b) => b.playerId === playerId);
	if (!stats) {
		stats = {
			playerId,
			order: inn.bowlers.length,
			legalBalls: 0,
			runsConceded: 0,
			wickets: 0,
			maidens: 0,
			dots: 0,
			wides: 0,
			noBalls: 0
		};
		inn.bowlers.push(stats);
	}
	return stats;
}
function batter(inn, id) {
	return inn.batters.find((b) => b.playerId === id);
}
function startPartnership(inn) {
	if (inn.strikerId && inn.nonStrikerId) inn.partnerships.push({
		batterIds: [inn.strikerId, inn.nonStrikerId],
		runs: 0,
		legalBalls: 0,
		ended: false
	});
}
function currentPartnership(inn) {
	const p = inn.partnerships[inn.partnerships.length - 1];
	return p && !p.ended ? p : void 0;
}
function swapEnds(inn) {
	if (inn.loneBatter) return;
	[inn.strikerId, inn.nonStrikerId] = [inn.nonStrikerId, inn.strikerId];
}
function vacate(inn, playerId) {
	if (inn.strikerId === playerId) inn.strikerId = null;
	else if (inn.nonStrikerId === playerId) inn.nonStrikerId = null;
	const p = currentPartnership(inn);
	if (p) p.ended = true;
}
/** Last-man-stands: when nobody is left to come in, the survivor bats alone. */
function handleVacancy(inn, match) {
	if (!match.settings.lastManStands || inn.superOver) return;
	const survivors = [inn.strikerId, inn.nonStrikerId].filter((x) => x !== null);
	if (survivors.length !== 1) return;
	if (availableBatters(inn, match.teams[inn.battingTeam]).length > 0) return;
	inn.loneBatter = true;
	inn.strikerId = survivors[0];
	inn.nonStrikerId = null;
}
function applyBall(inn, ev, match, over) {
	const { settings } = match;
	const legal = isLegal(ev.extra);
	const freeHit = inn.freeHitNext;
	const r = ballRuns(ev, settings);
	const striker = batter(inn, inn.strikerId);
	const bowler = inn.bowlers.find((b) => b.playerId === inn.bowlerId);
	const currentOver = inn.overs[inn.overs.length - 1];
	inn.runs += r.total;
	inn.extras.wides += r.wides;
	inn.extras.noBalls += r.noBalls;
	inn.extras.byes += r.byes;
	inn.extras.legByes += r.legByes;
	if (legal) inn.legalBalls += 1;
	if (ev.extra !== "wide") striker.balls += 1;
	striker.runs += r.batter;
	if (ev.boundary && (ev.extra === null || ev.extra === "noBall")) {
		if (ev.runs === 4) striker.fours += 1;
		if (ev.runs === 6) striker.sixes += 1;
	}
	bowler.runsConceded += r.conceded;
	bowler.wides += r.wides;
	if (ev.extra === "noBall") bowler.noBalls += 1;
	if (legal) {
		bowler.legalBalls += 1;
		if (r.conceded === 0) bowler.dots += 1;
	}
	const p = currentPartnership(inn);
	if (p) {
		p.runs += r.total;
		if (legal) p.legalBalls += 1;
	}
	currentOver.runs += r.total;
	currentOver.balls.push({
		eventId: ev.id,
		runs: ev.runs,
		extra: ev.extra,
		boundary: !!ev.boundary,
		wicket: !!ev.wicket,
		legal,
		freeHit
	});
	over.conceded += r.conceded;
	inn.freeHitNext = settings.freeHit && (ev.extra === "noBall" || freeHit && !legal);
	if (ev.runs % 2 === 1) swapEnds(inn);
	if (ev.wicket) {
		const out = batter(inn, ev.wicket.batterId);
		const credit = creditsBowler(ev.wicket.kind);
		out.dismissal = {
			kind: ev.wicket.kind,
			bowlerId: credit ? bowler.playerId : void 0,
			fielderId: ev.wicket.fielderId
		};
		inn.wickets += 1;
		if (credit) bowler.wickets += 1;
		inn.fallOfWickets.push({
			wicketNumber: inn.wickets,
			score: inn.runs,
			legalBalls: inn.legalBalls,
			batterId: out.playerId
		});
		vacate(inn, out.playerId);
		handleVacancy(inn, match);
	}
	const legalInOver = currentOver.balls.filter((b) => b.legal).length;
	if (legal && legalInOver === 6) {
		if (over.conceded === 0 && !over.bowlerChanged) bowler.maidens += 1;
		inn.previousOverBowlerId = bowler.playerId;
		inn.bowlerId = null;
		swapEnds(inn);
	}
	if (ev.wicket?.kind === "caught" && settings.catchNewBatterOnStrike && inn.strikerId !== null && inn.nonStrikerId === null && !inn.loneBatter) {
		inn.nonStrikerId = inn.strikerId;
		inn.strikerId = null;
	}
}
function applyRetire(inn, ev, match) {
	const b = batter(inn, ev.batterId);
	if (ev.kind === "retiredHurt") b.retiredHurt = true;
	else {
		b.dismissal = { kind: "retiredOut" };
		inn.wickets += 1;
		inn.fallOfWickets.push({
			wicketNumber: inn.wickets,
			score: inn.runs,
			legalBalls: inn.legalBalls,
			batterId: b.playerId
		});
	}
	vacate(inn, b.playerId);
	handleVacancy(inn, match);
}
function checkInningsEnd(inn, match) {
	if (inn.ended) return;
	const team = match.teams[inn.battingTeam];
	const vacant = inn.strikerId === null || inn.nonStrikerId === null && !inn.loneBatter;
	let reason = null;
	if (inn.target !== null && inn.runs >= inn.target) reason = "targetReached";
	else if (inn.wickets >= inn.wicketsLimit) reason = "allOut";
	else if (vacant && availableBatters(inn, team).length === 0) reason = "allOut";
	else if (inn.legalBalls >= inn.oversLimit * 6) reason = "oversComplete";
	if (reason) {
		inn.ended = true;
		inn.endReason = reason;
	}
}
function computePhase(innings, match) {
	const cur = innings[innings.length - 1];
	if (!cur) return "needOpeners";
	if (cur.ended) {
		if (cur.index % 2 === 0) return "inningsBreak";
		return cur.runs === innings[cur.index - 1].runs && match.settings.superOver ? "superOverBreak" : "completed";
	}
	if (cur.strikerId === null || cur.nonStrikerId === null && !cur.loneBatter) return "needBatter";
	if (cur.bowlerId === null) return "needBowler";
	return "inPlay";
}
// src/push/moments.ts
/** Tournament team ids of the two sides (missing for a friendly with typed-in names). */
function teamIdsOf(match) {
	return match.teams.map((t) => t.teamId).filter((id) => !!id);
}
/** Moments caused by the events `next` has beyond what `prev` already had. */
function momentsBetween(prev, next) {
	const shared = sharedPrefix(prev?.events ?? [], next.events);
	const at = (n) => deriveMatchState({
		...next,
		events: next.events.slice(0, n)
	});
	const out = [];
	let before = at(shared);
	for (let n = shared + 1; n <= next.events.length; n++) {
		const after = at(n);
		out.push(...diff(before, after, next, next.events[n - 1].at));
		before = after;
	}
	return out;
}
/**
* What to actually send from one upload. A phone that was offline can upload
* a whole over at once; fans want the latest news, not a burst of old alerts.
* - Key moments older than `maxAgeMs` (by the server's clock) are dropped.
* - Of the rest, only the newest key moment is kept.
* - A result is always kept.
*/
function momentsToSend(moments, now, maxAgeMs = 18e5) {
	const result = moments.filter((m) => m.kind === "result");
	const fresh = moments.filter((m) => m.kind !== "result" && now - m.at <= maxAgeMs);
	return [...fresh.length ? [fresh[fresh.length - 1]] : [], ...result];
}
function sharedPrefix(a, b) {
	let i = 0;
	while (i < a.length && i < b.length && a[i].id === b[i].id) i++;
	return i;
}
function diff(before, after, match, at) {
	const out = [];
	const t = texts(match);
	if (before.innings.length === 0 && after.innings.length > 0) out.push({
		key: "start",
		kind: "start",
		level: "key",
		at,
		text: t.start()
	});
	after.innings.forEach((inn, i) => {
		if (inn.superOver) return;
		const old = before.innings[i];
		const oldWickets = old?.fallOfWickets.length ?? 0;
		for (const fow of inn.fallOfWickets.slice(oldWickets)) out.push({
			key: `w:${i}:${fow.wicketNumber}`,
			kind: "wicket",
			level: "key",
			at,
			text: t.wicket(inn, fow.batterId)
		});
		for (const b of inn.batters) {
			const was = old?.batters.find((x) => x.playerId === b.playerId)?.runs ?? 0;
			for (const mark of [50, 100]) if (was < mark && b.runs >= mark) out.push({
				key: `m${mark}:${i}:${b.playerId}`,
				kind: mark === 50 ? "fifty" : "hundred",
				level: "key",
				at,
				text: t.milestone(inn, b.playerId, b.runs, b.balls, mark)
			});
		}
	});
	if (before.phase !== "inningsBreak" && after.phase === "inningsBreak" && after.innings[0]?.ended) out.push({
		key: "inn:0",
		kind: "inningsBreak",
		level: "key",
		at,
		text: t.inningsBreak(after.innings[0])
	});
	if (before.phase !== "superOverBreak" && after.phase === "superOverBreak") {
		const n = after.innings.filter((i) => i.superOver).length / 2 + 1;
		out.push({
			key: `so:${n}`,
			kind: "superOver",
			level: "key",
			at,
			text: t.superOver()
		});
	}
	if (!before.result && after.result) out.push({
		key: "result",
		kind: "result",
		level: "result",
		at,
		text: t.result(after)
	});
	return out;
}
var BN_DIGITS = "০১২৩৪৫৬৭৮৯";
var digits = (s, lang) => lang === "bn" ? s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]) : s;
function overs(legalBalls) {
	const o = Math.floor(legalBalls / 6);
	const b = legalBalls % 6;
	return b ? `${o}.${b}` : `${o}`;
}
function texts(match) {
	const team = (i) => match.teams[i].name;
	const player = (id) => {
		for (const tm of match.teams) {
			const p = tm.players.find((x) => x.id === id);
			if (p) return p.name;
		}
		return id;
	};
	const score = (inn, lang) => lang === "bn" ? digits(`${inn.runs}/${inn.wickets} (${overs(inn.legalBalls)} ওভার)`, "bn") : `${inn.runs}/${inn.wickets} (${overs(inn.legalBalls)} ov)`;
	const both = (bn, en) => ({
		bn: {
			title: bn[0],
			body: bn[1]
		},
		en: {
			title: en[0],
			body: en[1]
		}
	});
	return {
		start() {
			const winner = team(match.toss.winner);
			const bat = match.toss.decision === "bat";
			return both([`${team(0)} বনাম ${team(1)}`, `খেলা শুরু! ${winner} টস জিতে ${bat ? "ব্যাটিং" : "বোলিং"} নিয়েছে।`], [`${team(0)} v ${team(1)}`, `Match started. ${winner} won the toss and chose to ${bat ? "bat" : "bowl"}.`]);
		},
		wicket(inn, batterId) {
			const name = player(batterId);
			const side = team(inn.battingTeam);
			return both([`উইকেট! ${name} আউট`, `${side} ${score(inn, "bn")}`], [`Wicket! ${name} is out`, `${side} ${score(inn, "en")}`]);
		},
		milestone(inn, id, runs, balls, mark) {
			const name = player(id);
			const side = team(inn.battingTeam);
			const bnMark = mark === 50 ? "ফিফটি" : "সেঞ্চুরি";
			const enMark = mark === 50 ? "fifty" : "hundred";
			return both([`${name}-এর ${bnMark}!`, `${digits(`${runs}`, "bn")} রান, ${digits(`${balls}`, "bn")} বলে। ${side} ${score(inn, "bn")}`], [`A ${enMark} for ${name}!`, `${runs} off ${balls} balls. ${side} ${score(inn, "en")}`]);
		},
		inningsBreak(first) {
			const target = first.runs + 1;
			const chasing = team(first.bowlingTeam);
			return both(["ইনিংস বিরতি", `${team(first.battingTeam)} ${score(first, "bn")}। জিততে ${chasing}-এর দরকার ${digits(`${target}`, "bn")} রান।`], ["Innings break", `${team(first.battingTeam)} ${score(first, "en")}. ${chasing} need ${target} to win.`]);
		},
		superOver() {
			return both(["ম্যাচ টাই!", "সুপার ওভারে খেলার নিষ্পত্তি হবে।"], ["Scores level!", "A one-over Super Over will decide it."]);
		},
		result(state) {
			const r = state.result;
			const main = state.innings.filter((i) => !i.superOver);
			const line = (lang) => main.map((i) => `${team(i.battingTeam)} ${score(i, lang)}`).join(lang === "bn" ? "। " : ". ");
			if (r.kind === "tie") return both(["ম্যাচ টাই", line("bn")], ["Match tied", line("en")]);
			const w = team(r.winner);
			if (r.by === "superOver") return both([`${w} সুপার ওভারে জয়ী!`, line("bn")], [`${w} win the Super Over!`, line("en")]);
			const n = r.margin;
			const bnBy = `${digits(`${n}`, "bn")} ${r.by === "runs" ? "রানে" : "উইকেটে"}`;
			const enBy = `${n} ${r.by === "runs" ? n === 1 ? "run" : "runs" : n === 1 ? "wicket" : "wickets"}`;
			return both([`${w} ${bnBy} জিতেছে!`, line("bn")], [`${w} won by ${enBy}!`, line("en")]);
		}
	};
}
export { momentsBetween, momentsToSend, teamIdsOf };
