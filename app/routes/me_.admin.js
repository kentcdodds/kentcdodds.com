"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handle = void 0;
exports.loader = loader;
exports.action = action;
exports.default = MeAdmin;
exports.ErrorBoundary = ErrorBoundary;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var clsx_1 = require("clsx");
var React = require("react");
var react_table_1 = require("react-table");
var button_tsx_1 = require("#app/components/button.tsx");
var form_elements_tsx_1 = require("#app/components/form-elements.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var prisma_server_ts_1 = require("#app/utils/prisma.server.ts");
var session_server_ts_1 = require("#app/utils/session.server.ts");
exports.handle = {
    getSitemapEntries: function () { return null; },
};
var DEFAULT_LIMIT = 100;
var isSortOrder = function (s) { return s === 'asc' || s === 'desc'; };
var isOrderField = function (s) {
    return s === 'team' ||
        s === 'id' ||
        s === 'email' ||
        s === 'firstName' ||
        s === 'createdAt';
};
function getLoaderData(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var searchParams, query, select, order, orderField, spOrder, spOrderField, limit, users;
        var _c;
        var _d;
        var request = _b.request;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    searchParams = new URL(request.url).searchParams;
                    query = searchParams.get('q');
                    select = {
                        createdAt: true,
                        firstName: true,
                        email: true,
                        id: true,
                        team: true,
                    };
                    order = 'asc';
                    orderField = 'createdAt';
                    spOrder = searchParams.get('order');
                    spOrderField = searchParams.get('orderField');
                    if (isSortOrder(spOrder))
                        order = spOrder;
                    if (isOrderField(spOrderField))
                        orderField = spOrderField;
                    limit = Number((_d = searchParams.get('limit')) !== null && _d !== void 0 ? _d : DEFAULT_LIMIT);
                    return [4 /*yield*/, prisma_server_ts_1.prisma.user.findMany({
                            where: query
                                ? {
                                    OR: [
                                        { firstName: { contains: query } },
                                        { email: { contains: query } },
                                        { id: { contains: query } },
                                        (0, misc_tsx_1.isTeam)(query) ? { team: { equals: query } } : null,
                                    ].filter(misc_tsx_1.typedBoolean),
                                }
                                : {},
                            select: select,
                            orderBy: (_c = {}, _c[orderField] = order, _c),
                            take: limit,
                        })];
                case 1:
                    users = _e.sent();
                    return [2 /*return*/, {
                            users: users.map(function (user) { return (__assign(__assign({}, user), { createdAt: (0, misc_tsx_1.formatDate)(user.createdAt) })); }),
                        }];
            }
        });
    });
}
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var _c;
        var request = _b.request;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.requireAdminUser)(request)];
                case 1:
                    _d.sent();
                    _c = node_1.json;
                    return [4 /*yield*/, getLoaderData({ request: request })];
                case 2: return [2 /*return*/, _c.apply(void 0, [_d.sent()])];
            }
        });
    });
}
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var requestText, form, _c, id, values, error_1;
        var request = _b.request;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.requireAdminUser)(request)];
                case 1:
                    _d.sent();
                    return [4 /*yield*/, request.text()];
                case 2:
                    requestText = _d.sent();
                    form = new URLSearchParams(requestText);
                    _d.label = 3;
                case 3:
                    _d.trys.push([3, 8, , 9]);
                    _c = Object.fromEntries(form), id = _c.id, values = __rest(_c, ["id"]);
                    if (!id)
                        return [2 /*return*/, (0, node_1.json)({ error: 'id is required' }, { status: 400 })];
                    if (!(request.method === 'DELETE')) return [3 /*break*/, 5];
                    return [4 /*yield*/, prisma_server_ts_1.prisma.user.delete({ where: { id: id } })];
                case 4:
                    _d.sent();
                    return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, prisma_server_ts_1.prisma.user.update({
                        where: { id: id },
                        data: values,
                    })];
                case 6:
                    _d.sent();
                    _d.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    error_1 = _d.sent();
                    console.error(error_1);
                    return [2 /*return*/, (0, node_1.json)({ error: (0, misc_tsx_1.getErrorMessage)(error_1) })];
                case 9: return [2 /*return*/, (0, node_1.redirect)(new URL(request.url).pathname)];
            }
        });
    });
}
var userColumns = [
    {
        Header: 'Created',
        accessor: 'createdAt',
    },
    {
        Header: 'ID',
        accessor: 'id',
    },
    {
        Header: 'First Name',
        accessor: 'firstName',
    },
    {
        Header: 'Team',
        accessor: 'team',
    },
    {
        Header: 'Email',
        accessor: 'email',
    },
];
function Cell(_a) {
    var value = _a.value, user = _a.row.values, propertyName = _a.column.id;
    var _b = React.useState(false), isEditing = _b[0], setIsEditing = _b[1];
    var dc = (0, misc_tsx_1.useDoubleCheck)();
    return isEditing ? (propertyName === 'id' ? (<react_1.Form method="delete" onSubmit={function () { return setIsEditing(false); }} onBlur={function () { return setIsEditing(false); }} onKeyUp={function (e) {
            if (e.key === 'Escape')
                setIsEditing(false);
        }}>
				<input type="hidden" name="id" value={user.id}/>
				<button_tsx_1.Button type="submit" variant="danger" autoFocus {...dc.getButtonProps()}>
					{dc.doubleCheck ? 'You sure?' : 'Delete'}
				</button_tsx_1.Button>
			</react_1.Form>) : (<react_1.Form method="POST" onSubmit={function () { return setIsEditing(false); }} onBlur={function () { return setIsEditing(false); }} onKeyUp={function (e) {
            if (e.key === 'Escape')
                setIsEditing(false);
        }}>
				<input type="hidden" name="id" value={user.id}/>
				<input type="text" defaultValue={value} name={propertyName} autoFocus/>
			</react_1.Form>)) : (<button className="border-none" onClick={function () { return setIsEditing(true); }}>
			{value || 'NO_VALUE'}
		</button>);
}
var defaultColumn = {
    Cell: Cell,
};
function MeAdmin() {
    var _a, _b;
    var data = (0, react_1.useLoaderData)();
    var searchInputRef = React.useRef(null);
    var _c = (0, react_1.useSearchParams)(), searchParams = _c[0], setSearchParams = _c[1];
    var _d = React.useState((_a = searchParams.get('q')) !== null && _a !== void 0 ? _a : ''), query = _d[0], setQuery = _d[1];
    var _e = React.useState((_b = searchParams.get('limit')) !== null && _b !== void 0 ? _b : String(DEFAULT_LIMIT)), limit = _e[0], setLimit = _e[1];
    var spOrder = searchParams.get('order');
    var spOrderField = searchParams.get('orderField');
    var _f = React.useState({
        order: isSortOrder(spOrder) ? spOrder : 'asc',
        field: isOrderField(spOrderField) ? spOrderField : 'createdAt',
    }), ordering = _f[0], setOrdering = _f[1];
    var actionData = (0, react_1.useActionData)();
    var syncSearchParams = (0, misc_tsx_1.useDebounce)(function () {
        if (searchParams.get('q') === query &&
            searchParams.get('limit') === limit) {
            return;
        }
        var newParams = new URLSearchParams(searchParams);
        if (query) {
            newParams.set('q', query);
        }
        else {
            newParams.delete('q');
        }
        if (limit && limit !== String(DEFAULT_LIMIT)) {
            newParams.set('limit', limit);
        }
        else {
            newParams.delete('limit');
        }
        setSearchParams(newParams, { replace: true });
    }, 400);
    React.useEffect(function () {
        syncSearchParams();
    }, [query, limit, syncSearchParams]);
    React.useEffect(function () {
        var newParams = new URLSearchParams(searchParams);
        if (ordering.field === 'createdAt') {
            newParams.delete('orderField');
        }
        else {
            newParams.set('orderField', ordering.field);
        }
        if (ordering.order === 'asc') {
            newParams.delete('order');
        }
        else {
            newParams.set('order', ordering.order);
        }
        if (newParams.toString() !== searchParams.toString()) {
            setSearchParams(newParams, { replace: true });
        }
    }, [ordering, searchParams, setSearchParams]);
    var _g = 
    // @ts-expect-error 🤷‍♂️ no idea why defaultColumn isn't work ing here...
    (0, react_table_1.useTable)({ columns: userColumns, data: data.users, defaultColumn: defaultColumn }), getTableProps = _g.getTableProps, getTableBodyProps = _g.getTableBodyProps, headerGroups = _g.headerGroups, rows = _g.rows, prepareRow = _g.prepareRow;
    return (<grid_tsx_1.Grid>
			<div className="col-span-full">
				<typography_tsx_1.H1>Admin panel</typography_tsx_1.H1>
			</div>
			{(actionData === null || actionData === void 0 ? void 0 : actionData.error) ? (<>
					<spacer_tsx_1.Spacer size="3xs"/>
					<p role="alert" className="col-span-full text-sm text-red-500">
						{actionData.error}
					</p>
				</>) : null}
			<spacer_tsx_1.Spacer size="2xs"/>
			<div className="col-span-full">
				<react_1.Form method="get">
					<div className="flex flex-wrap items-center gap-4">
						<div className="flex-1">
							<div className="relative flex-1">
								<button title={query === '' ? 'Search' : 'Clear search'} type="button" onClick={function () {
            var _a;
            setQuery('');
            // manually sync immediately when the
            // change was from a finite interaction like this click.
            syncSearchParams();
            (_a = searchInputRef.current) === null || _a === void 0 ? void 0 : _a.focus();
        }} className={(0, clsx_1.clsx)('absolute left-6 top-0 flex h-full items-center justify-center border-none bg-transparent p-0 text-slate-500', {
            'cursor-pointer': query !== '',
            'cursor-default': query === '',
        })}>
									<icons_tsx_1.SearchIcon />
								</button>
								<input ref={searchInputRef} type="search" value={query} onChange={function (event) { return setQuery(event.currentTarget.value); }} name="q" placeholder="Filter users" className="text-primary bg-primary border-secondary focus:bg-secondary w-full rounded-full border py-6 pl-14 pr-6 text-lg font-medium hover:border-team-current focus:border-team-current focus:outline-none md:pr-24"/>
								<div className="absolute right-2 top-0 flex h-full w-14 items-center justify-between text-lg font-medium text-slate-500">
									<span title="Total results shown">{rows.length}</span>
								</div>
							</div>
						</div>
						<form_elements_tsx_1.Field label="Limit" name="limit" value={limit} type="number" step="1" min="1" max="10000" onChange={function (event) { return setLimit(event.currentTarget.value); }} placeholder="results limit"/>
					</div>
				</react_1.Form>
			</div>
			<spacer_tsx_1.Spacer size="2xs"/>
			<div className="col-span-full overflow-x-scroll">
				<table {...getTableProps({
        className: 'border-slate-500 border-4',
    })}>
					<thead>
						{headerGroups.map(function (headerGroup) { return (<tr {...headerGroup.getHeaderGroupProps()}>
								{headerGroup.headers.map(function (column) { return (<th {...column.getHeaderProps({
                className: 'border-b-4 border-blue-500 font-bold',
            })}>
										<button className="flex w-full justify-center gap-1" onClick={function () {
                    setOrdering(function (prev) {
                        var field = column.id;
                        if (!isOrderField(field))
                            return prev;
                        if (prev.field === column.id) {
                            return {
                                field: field,
                                order: prev.order === 'asc' ? 'desc' : 'asc',
                            };
                        }
                        else {
                            return { field: field, order: 'asc' };
                        }
                    });
                }}>
											{column.render('Header')}
											{ordering.order === 'asc' ? (<icons_tsx_1.ChevronUpIcon title="Asc" className={(0, clsx_1.clsx)('ml-2 text-gray-400', {
                        'opacity-0': ordering.field !== column.id,
                    })}/>) : (<icons_tsx_1.ChevronDownIcon title="Desc" className={(0, clsx_1.clsx)('ml-2 text-gray-400', {
                        'opacity-0': ordering.field !== column.id,
                    })}/>)}
										</button>
									</th>); })}
							</tr>); })}
					</thead>
					<tbody {...getTableBodyProps()}>
						{rows.map(function (row) {
            prepareRow(row);
            return (<tr {...row.getRowProps()}>
									{row.cells.map(function (cell) {
                    return (<td {...cell.getCellProps({
                        className: 'p-3 bg-opacity-30 bg-gray-100 border-slate-100 dark:bg-gray-800 border-2 dark:border-slate-500',
                    })}>
												{cell.render('Cell')}
											</td>);
                })}
								</tr>);
        })}
					</tbody>
				</table>
			</div>
		</grid_tsx_1.Grid>);
}
function ErrorBoundary() {
    var error = (0, misc_tsx_1.useCapturedRouteError)();
    console.error(error);
    if (error instanceof Error) {
        return (<div>
				<h2>Error</h2>
				<pre>{error.stack}</pre>
			</div>);
    }
    else {
        return <h2>Unknown Error</h2>;
    }
}
/*
eslint
  react/jsx-key: "off",
*/
