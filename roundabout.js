let State = {
    teams: [],
    ones: [],
    twos: [],
    highlighted: "(none)",

    load: function (url) {
        return m.request({
            method: "GET",
            url: url
        }).then(function (result) {
            State.teams = result.teams;
            State.ones = result.ones;
            State.twos = result.twos;
        });
    },
    isHighlighted: player => State.highlighted == player,
    highlight: function (player) { State.highlighted = player; }
};

function showPlayer(player) {
    return State.isHighlighted(player) ? m("mark", m("strong", player.toUpperCase())) : player;
};

const trophyIcon = () => m.trust("&#x1F3C6;");
const zapIcon = () => m.trust("&#x26A1;");

const Standings = {
    view: function (vnode) {
        const POINTS = {
            ONES: 9,
            TWOS: 5,
            THREES: 45
        };
        // Each row:
        // <Team players> <1s> <2s> <3s> <Total>
        // Sort by total.
        let team_scores = State.teams.map(t => { return { members: t.members, ones: 0, twos: 0, threes: 0, total: function () { return this.ones + this.twos + this.threes; } }; });
        for (const round of State.ones) {
            for (const match of round) {
                if ('score' in match) {
                    // Identify winner.
                    let winner = match.players[match.score[0] > match.score[1] ? 0 : 1];
                    // Find team, add score.
                    const team_index = team_scores.findIndex(ts => ts.members.includes(winner));
                    team_scores[team_index].ones += POINTS.ONES;
                }
            }
        }

        for (const match of State.twos) {
            // Identify winner (any player from the winning pair)
            let winner = match.pairs[match.score[0] > match.score[1] ? 0 : 1][0];
            // Find team, add score.
            const team_index = team_scores.findIndex(ts => ts.members.includes(winner));
            team_scores[team_index].twos += POINTS.TWOS;
        }

        // Need a custom sort to get descending.
        // First by total, then by 3s/2s/1s.
        team_scores.sort((lhs, rhs) => {
            const lhsTotal = lhs.total();
            const rhsTotal = rhs.total();
            if (lhsTotal == rhsTotal) {
                if (lhs.threes == rhs.threes) {
                    if (lhs.twos == rhs.twos) {
                        return lhs.ones < rhs.ones;
                    }

                    return lhs.twos < rhs.twos;
                }

                return rhs.threes < lhs.threes;
            }

            return lhsTotal < rhsTotal;
        });

        let best1v1Idx = 0;
        let best2v2Idx = 0;
        let best3v3Idx = 0;

        team_scores.forEach((scores, idx) => {
            if (scores.ones > team_scores[best1v1Idx].ones) {
                best1v1Idx = idx;
            }

            if (scores.twos > team_scores[best2v2Idx].twos) {
                best2v2Idx = idx;
            }

            if (scores.threes > team_scores[best3v3Idx].threes) {
                best3v3Idx = idx;
            }
        })

        return m(".column",
            m("table.table.table-striped.table-hover", [
                m("thead",
                    m("tr", [
                        m("th", { colspan: 4 }, "Team"),
                        m("th.text-right", "1v1"),
                        m("th.text-right", "2v2"),
                        m("th.text-right", "3v3"),
                        m("th.text-right", "Total"),
                    ])
                ),
                m("tbody", team_scores.map((team_score, i) => m("tr",
                    m("td", (i == 0) ? m("strong", trophyIcon(), (i + 1)) : (i + 1)),
                    team_score.members.map(x => m("td", showPlayer(x))),
                    m("td.text-right", i == best1v1Idx && team_score.ones > 0 ? m("strong", trophyIcon(), team_score.ones) : team_score.ones),
                    m("td.text-right", i == best2v2Idx && team_score.twos > 0 ? m("strong", trophyIcon(), team_score.twos) : team_score.twos),
                    m("td.text-right", i == best3v3Idx && team_score.threes > 0 ? m("strong", trophyIcon(), team_score.threes) : team_score.threes),
                    m("td.text-right", (i == 0) ? m("strong", trophyIcon(), team_score.total()) : team_score.total())
                ))),
                m("caption", m("h1", "Standings"))
            ])
        );
    }
};

const Team = {
    view: function (vnode) {
        return m(".card.team", [
            m(".card-header", m("h2.card-title", showPlayer(vnode.attrs.members[0]))),
            m("ul.card-body", vnode.attrs.members.slice(1).map(x => m("li", showPlayer(x)))),
            m(".card-footer")
        ]);
    }
};

const Teams = {
    view: function (vnode) {
        return [
            m("section.columns", State.teams.map(t => m(".column.col-lg-3.col-md-6.col-sm-12", m(Team, t)))),
            m("section.columns", m(Standings))
        ];
    }
};

const Threes = {
    view: function (vnode) {
        const all_but_first_teams = State.teams.slice(1);
        const all_but_last_teams = State.teams.slice(0, -1);
        return m(".columns", [
            m(".column", [
                m("table.table", [
                    m("caption", m("h2", "First Bo3")),
                    m("thead.text-center",
                        m("tr", [
                            m("th"),
                            all_but_last_teams.map(t => m("th", showPlayer(t.members[0])))
                        ])
                    ),
                    m("tbody", all_but_first_teams.map((t, row) => m("tr", [
                        m("th", showPlayer(t.members[0])),
                        all_but_last_teams.map((t, col) => m("td", { "class": row < col ? "bg-gray" : "" }))
                    ])))
                ])
            ])
        ]);
    }
};

const Twos = {
    view: function (vnode) {
        const pairs = [[0, 1], [0, 2], [1, 2]];
        const all_but_first_teams = State.teams.slice(1);
        const all_but_last_teams = State.teams.slice(0, -1);
        return m(".columns", [
            m(".column.col-12", [
                m("table.table.table-scroll", [
                    m("caption", m("h2", "Round-robin Bo3")),
                    m("thead.text-center",
                        m("tr", [
                            m("th", { colspan: 2 }),
                            all_but_last_teams.map(t => m("th", { colspan: 3 }, ["Team ", showPlayer(t.members[0])]))
                        ]),
                        m("tr", [
                            m("th", { colspan: 2 }),
                            all_but_last_teams.map(t => pairs.map(p => m("th", [showPlayer(t.members[p[0]]), " ", showPlayer(t.members[p[1]])])))
                        ])
                    ),
                    all_but_first_teams.map((t, row) => m("tbody", pairs.map((p, i) => {
                        let cells = [];
                        const player_a = t.members[p[0]];
                        const player_b = t.members[p[1]];
                        if (i == 0) {
                            cells.push(m("th", { rowspan: 3 }, ["Team ", showPlayer(player_a)]));
                        }

                        cells.push(m("th", [showPlayer(player_a), " ", showPlayer(player_b)]));
                        cells.push(...all_but_last_teams.map((t, col) => {
                            return pairs.map((p) => {
                                const opponent_a = t.members[p[0]];
                                const opponent_b = t.members[p[1]];
                                let match = undefined;
                                let pairIdx = -1;
                                let opponentIdx = -1;

                                const classes = () => {
                                    if (row < col) {
                                        return { class: "bg-gray" };
                                    }

                                    if ([player_a, player_b, opponent_a, opponent_b].some(State.isHighlighted)) {
                                        return { class: "bg-secondary text-center" };
                                    }

                                    return { class: "text-center" };
                                };

                                if (row >= col) {
                                    const players = [player_a, player_b, opponent_a, opponent_b];

                                    match = State.twos.find(match => match.pairs.flat().every(player => players.includes(player)));
                                    if (match) {
                                        pairIdx = match.pairs.findIndex(pair => pair.includes(player_a));
                                        opponentIdx = (pairIdx + 1) % 2;
                                    }
                                }

                                return m("td", classes(), match ? (match.score[pairIdx] + " - " + match.score[opponentIdx]) : "");
                            });
                        }))
                        return m("tr", cells);
                    })))
                ])
            ])
        ]);
    }
};

const Ones = {
    view: function (vnode) {
        return m(".columns", [
            m(".column.col-12", [
                m("table.table.table-striped", [
                    m("thead", [
                        m("tr", [
                            m("th"), // Player
                            State.ones.map((_, i) => m("th.text-center", { "colspan": 2 }, "Round " + (i + 1)))
                        ]),
                        m("tr", [
                            m("th", "Player"),
                            State.ones.map(() => [
                                m("th.text-center", "Opponent"),
                                m("th.text-center", "Result")
                            ])
                        ]),

                    ]),
                    m("tbody", State.teams.map(t => [
                        t.members.map(member => m("tr", State.isHighlighted(member) ? { class: "bg-secondary" } : {}, [
                            m("td", showPlayer(member)),
                            State.ones.map((matches) => {
                                const match = matches.find(match => match.players.includes(member));
                                const memberIdx = match.players.indexOf(member);
                                const opponentIdx = (memberIdx + 1) % 2;

                                return [
                                    m("td.text-center", showPlayer(match.players[opponentIdx])),
                                    m("td.text-center", 'score' in match ? (match.score[memberIdx] + " - " + match.score[opponentIdx]) : "")
                                ];
                            })

                        ]))
                    ]))
                ])
            ])
        ]);
    }
};

const Schedule = {
    view: function(vnode) {
        return m(".columns", [
            m("section.column.col-6.col-md-12", [
                m(".columns", [
                    m(".column", this.ones())
                ]),
            ]),

            m("section.column.col-6.col-md-12", [
                m(".columns", [
                    m(".column", this.twos())
                ])
            ])
        ])
    },

    ones: function() {
        // For each element of current round
        // (last in array), find remaining ones.
        const ones = (State.ones.length > 0 ? State.ones[State.ones.length - 1] : []).filter((match) => !('score' in match));
        return [
            m("h2", "1v1"),
            m("ul", ones.map((match) => m("li", [showPlayer(match.players[0]), zapIcon(), showPlayer(match.players[1])])))
        ];
    },

    twos: function() {
        

        let twos = [];

        if (State.teams.length > 1) {
            // For each pair, find the first match without a score.
            // Gives one match per pair.
            let available_pairs = {};
            for (let i = 0; i < State.teams.length; ++i) {
                available_pairs[i] = [[0, 1], [0, 2], [1, 2]];
            }

            for (let i = 0;  i < State.teams.length - 1; ++i) {
                const homeTeam = State.teams[i];
                for (const homePair of available_pairs[i]) {
                    const homePlayerA = homeTeam.members[homePair[0]];
                    const homePlayerB = homeTeam.members[homePair[1]];
                    let matchmaked = false;
                    for (let j = i + 1; j < State.teams.length && !matchmaked; ++j) {
                        const awayTeam = State.teams[j];
                        let awayPairs = available_pairs[j];
                        for (let k = 0; k < awayPairs.length && !matchmaked; ++k) {
                            const awayPair = awayPairs[k];
                            const awayPlayerA = awayTeam.members[awayPair[0]];
                            const awayPlayerB = awayTeam.members[awayPair[1]]; 
                            // Is this still a match to play?
                            const players = [homePlayerA, homePlayerB, awayPlayerA, awayPlayerB];
                            if (!State.twos.some(match => match.pairs.flat().every(player => players.includes(player)))) {
                                // Yes!
                                // Make the opponent pair unavailable, move on to next.
                                twos.push([[homePlayerA, homePlayerB], [awayPlayerA, awayPlayerB]]);
                                available_pairs[j].splice(k, 1);
                                matchmaked = true;
                            }
                        }
                    }
                }
            }
        }
        return [
            m("h2", "2v2"),
            twos.map((match) => m(".columns", [
                // homeA & homeB
                m(".column.col-2.col-lg-auto", showPlayer(match[0][0])),
                m(".column.col-1.hide-xl", m.trust("&amp;")),
                m(".column.col-2.col-lg-auto", showPlayer(match[0][1])),
                
                // <zap>
                m(".column.col-2.col-lg-auto.text-center", zapIcon()),

                // awayA & awayB
                m(".column.col-2.col-lg-auto", showPlayer(match[1][0])),
                m(".column.col-1.hide-xl", m.trust("&amp;")),
                m(".column.col-2.col-lg-auto", showPlayer(match[1][1])),

                // -------------- (divider)
                m(".column.hide-md.divider")
            ]))
        ]
    }
};

const App = {
    oninit: function (vnode) {
        State.load(vnode.attrs.dataUrl);
    },
    view: function (vnode) {
        const highlighter = function (value) { return State.isHighlighted(value) ? { value: value, selected: true } : { value: value }; };
        const nav_link = function (link) { return { class: "btn-lg btn btn-" + (m.route.get() == link ? "primary" : "link"), href: link }; };
        return [
            m("header.navbar", [
                m("section.navbar-section", [
                    m("strong.navbar-brand.mr-2", "The Roundabout"),
                    m(m.route.Link, nav_link("/teams"), "Teams"),
                ]),
                m("section.navbar-center", [
                    m(m.route.Link, nav_link("/3s"), "3v3"),
                    m(m.route.Link, nav_link("/2s"), "2v2"),
                    m(m.route.Link, nav_link("/1s"), "1v1"),
                    m(m.route.Link, nav_link("/schedule"), "Schedule"),
                ]),
                m("section.navbar-section", [
                    m(".input-group.input-inline", [
                        m("select.form-select", { onchange: function (e) { State.highlight(e.target.value); } }, [
                            m("option", highlighter("(none)"), "(no player highlighted)"),
                            State.teams.map(team => team.members.map(member => m("option", highlighter(member), member)))
                        ]),
                    ])
                ])
            ]),
            m(".container", vnode.children)
        ];
    }
};