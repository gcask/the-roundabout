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
    return State.isHighlighted(player) ? m("mark", m("strong.is-uppercase", player)) : player;
};

function teamName(team) {
    return team["name"] || ["Team ", showPlayer(team.members[0])];
}

const trophyIcon = () => m.trust("&#x1F3C6;");
const zapIcon = () => m.trust("&#x26A1;");
const medalIcon = () => m.trust("&#x1F3C5;");

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
        let team_scores = State.teams.map(t => { return { name: t.name, members: t.members, ones: 0, twos: 0, threes: 0, total: function () { return this.ones + this.twos + this.threes; } }; });
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

        return m(".column.table-container",
            m("table.table.is-striped.is-hoverable.is-fullwidth", [
                m("thead",
                    m("tr", [
                        m("th", {"colspan": 4}, "Team"),
                        m("th.has-text-right", "1v1"),
                        m("th.has-text-right", "2v2"),
                        m("th.has-text-right", "3v3"),
                        m("th.has-text-right", "Total"),
                    ])
                ),
                m("tbody", team_scores.map((team_score, i) => m("tr",
                    m("td", (i == 0) ? m("strong", trophyIcon(), teamName(team_score)) :  teamName(team_score)),
                    team_score.members.map(x => m("td.text-small", showPlayer(x))),
                    m("td.has-text-right", i == best1v1Idx && team_score.ones > 0 ? m("strong", medalIcon(), team_score.ones) : team_score.ones),
                    m("td.has-text-right", i == best2v2Idx && team_score.twos > 0 ? m("strong", medalIcon(), team_score.twos) : team_score.twos),
                    m("td.has-text-right", i == best3v3Idx && team_score.threes > 0 ? m("strong", medalIcon(), team_score.threes) : team_score.threes),
                    m("td.has-text-right", (i == 0) ? m("strong", trophyIcon(), team_score.total()) : team_score.total())
                ))),
                m("caption.has-text-left", m("h1.title", "Standings"))
            ])
        );
    }
};

const Team = {
    view: function (vnode) {
        return m(".card.team", [
            m("header.card-header", m("h2.card-header-title", teamName(vnode.attrs))),
            m("ul.card-content", vnode.attrs.members.map(x => m("li", showPlayer(x)))),
            m(".card-footer")
        ]);
    }
};

const Teams = {
    view: function (vnode) {
        return [
            m("section", [
                m("h1.title", "Teams"),
                m(".columns", State.teams.map(t => m(".column", m(Team, t))))
            ]),
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
                m("table.table.is-striped.is-hoverable.is-fullwidth", [
                    m("caption", m("h2.title", "First Bo3")),
                    m("thead",
                        m("tr", [
                            m("th"),
                            all_but_last_teams.map(t => m("th", teamName(t)))
                        ])
                    ),
                    m("tbody", all_but_first_teams.map((t, row) => m("tr", [
                        m("th", teamName(t)),
                        all_but_last_teams.map((t, col) => m("td", { "class": row < col ? "has-background-grey" : "" }))
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
        return m(".columns.", [
            m(".column.table-container", [
                m("table.table.is-hoverable.is-fullwidth", [
                    m("caption", m("h2.title", "Round-robin Bo3")),
                    m("thead",
                        m("tr", [
                            m("th", { colspan: 2 }),
                            all_but_last_teams.map(t => m("th.has-text-centered", { colspan: 3 }, teamName(t)))
                        ]),
                        m("tr", [
                            m("th", { colspan: 2 }),
                            all_but_last_teams.map(t => pairs.map(p => m("th.has-text-centered", [showPlayer(t.members[p[0]]), " ", showPlayer(t.members[p[1]])])))
                        ])
                    ),
                    all_but_first_teams.map((t, row) => m("tbody", pairs.map((p, i) => {
                        let cells = [];
                        const player_a = t.members[p[0]];
                        const player_b = t.members[p[1]];
                        if (i == 0) {
                            cells.push(m("th", { rowspan: 3 }, teamName(t)));
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
                                        return { class: "has-background-grey" };
                                    }

                                    if ([player_a, player_b, opponent_a, opponent_b].some(State.isHighlighted)) {
                                        return { class: "is-selected has-text-centered has-text-weight-bold" };
                                    }

                                    return { class: "has-text-centered" };
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
            m(".column.table-container", [
                m("table.table.is-striped.is-hoverable.is-fullwidth", [
                    m("thead", [
                        m("tr", [
                            m("th"), // Player
                            State.ones.map((_, i) => m("th.has-text-centered", { "colspan": 2 }, "Round " + (i + 1)))
                        ]),
                        m("tr", [
                            m("th", "Player"),
                            State.ones.map(() => [
                                m("th", "Opponent"),
                                m("th.has-text-right", "Result")
                            ])
                        ]),

                    ]),
                    m("tbody", State.teams.map(t => [
                        t.members.map(member => m("tr", State.isHighlighted(member) ? { class: "is-selected has-text-weight-bold" } : {}, [
                            m("td", showPlayer(member)),
                            State.ones.map((matches) => {
                                const match = matches.find(match => match.players.includes(member));
                                if (match !== undefined) {
                                    const memberIdx = match.players.indexOf(member);
                                    const opponentIdx = (memberIdx + 1) % 2;

                                    return [
                                        m("td", showPlayer(match.players[opponentIdx])),
                                        m("td.has-text-right", 'score' in match ? (match.score[memberIdx] + " - " + match.score[opponentIdx]) : "")
                                    ];
                                }
                                else {
                                    // Match is pending winner/loser of previous round.
                                    const possibleOpponents = matches.filter(match => match.players.some((player) => player.includes(member)))
                                        .map((match, idx) => {
                                            const memberIdx = match.players.indexOf(member);
                                            const opponentIdx = (memberIdx + 1) % 2;
                                            if (idx > 0) {
                                                return [" or ", showPlayer(match.players[opponentIdx])];
                                            }
                                            else {
                                                return showPlayer(match.players[opponentIdx]);
                                            }
                                        });
                                    return [
                                        m("td", possibleOpponents),
                                        m("td", "")
                                    ];
                                }

                            })

                        ]))
                    ]))
                ])
            ])
        ]);
    }
};

const Schedule = {
    view: function (vnode) {
        return m(".columns", [
            m("section.column",  this.ones()),
            m("section.column", this.twos())
        ])
    },

    ones: function () {
        return m(".card", [
            m("header.card-header", m("h2.title.card-header-title", "1v1")),
            m(".card-content",
                State.ones.map((matches, round) => {
                    const remaining = matches.filter((match) => !('score' in match));
                    if (remaining.length > 0) {
                        return m("section.section", [
                            m("h3.title", "Round " + (round + 1)),
                            remaining.map((match) => m("ul.columns.is-mobile", [
                                m("li.column", showPlayer(match.players[0])),
                                m("li.column.has-text-centered", zapIcon()),
                                m("li.column.has-text-right", showPlayer(match.players[1]))
                            ]))
                        ]);
                    }
                })
            )
        ]);
    },

    twos: function () {


        let twos = [];

        if (State.teams.length > 1) {
            // For each pair, find the first match without a score.
            // Gives one match per pair.
            let available_pairs = {};
            for (let i = 0; i < State.teams.length; ++i) {
                available_pairs[i] = [[0, 1], [0, 2], [1, 2]];
            }

            for (let i = 0; i < State.teams.length - 1; ++i) {
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
        return m(".card", [
            m("header.card-header", m("h2.title.card-header-title", "2v2")),
            m(".card-content",  twos.map((match) => m(".columns.is-mobile", [
                // homeA & homeB
                m(".column.has-text-right", showPlayer(match[0][0])),
                m(".column", showPlayer(match[0][1])),

                // <zap>
                m(".column.is-1", zapIcon()),

                // awayA & awayB
                m(".column.has-text-right", showPlayer(match[1][0])),
                m(".column", showPlayer(match[1][1])),
            ])))
        ]);
    }
};

const App = {
    oninit: function (vnode) {
        State.load(vnode.attrs.dataUrl);
        vnode.state.navbarExpanded = false;
    },
    view: function (vnode) {
        const highlighter = function (value) { return State.isHighlighted(value) ? { value: value, selected: true } : { value: value }; };
        const nav_link = function (link) { return { class: "navbar-item " + (m.route.get() == link ? "has-text-link has-background-link-light": ""), href: link }; };
        return [
            m("nav.navbar", [
                m(".navbar-brand", [
                    m(".navbar-item", "The Roundabout"),
                    
                    m("a.navbar-burger" + (vnode.state.navbarExpanded ? ".is-active" : ""), {'data-target': 'navbarMenu', onclick: function() { 
                        vnode.state.navbarExpanded = !vnode.state.navbarExpanded;
                    }}, [ m("span"), m("span"), m("span") ])
                ]),
                
                m(".navbar-menu"  + (vnode.state.navbarExpanded ? ".is-active" : ""), [
                    m(".navbar-start", [
                        m(m.route.Link, nav_link("/teams"), "Teams"),
                        m(m.route.Link, nav_link("/3s"), "3v3"),
                        m(m.route.Link, nav_link("/2s"), "2v2"),
                        m(m.route.Link, nav_link("/1s"), "1v1"),
                        m(m.route.Link, nav_link("/schedule"), "Schedule")
                    ]),
                    m(".navbar-end", [
                        m(".select", [
                            m("select", { onchange: function (e) { State.highlight(e.target.value); } }, [
                                m("option", highlighter("(none)"), "(no player highlighted)"),
                                State.teams.map(team => team.members.map(member => m("option", highlighter(member), member)))
                            ]),
                        ])
                    ])
                ]),
                
            ]),
            m(".container", vnode.children)
        ];
    }
};