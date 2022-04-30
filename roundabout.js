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
    return State.isHighlighted(player) ? m("mark", player) : player;
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
        return m(".columns", State.teams.map(t => m(".column.col-lg-3.col-md-6.col-sm-12", m(Team, t))));
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