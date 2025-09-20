"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KitForm = KitForm;
var react_1 = require("@remix-run/react");
var React = require("react");
var arrow_button_tsx_1 = require("#app/components/arrow-button.tsx");
var form_elements_tsx_1 = require("#app/components/form-elements.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
function KitForm(_a) {
    var _b;
    var formId = _a.formId, kitTagId = _a.kitTagId, kitFormId = _a.kitFormId;
    var websiteId = React.useId();
    var kit = (0, react_1.useFetcher)();
    var formRef = React.useRef(null);
    var isDone = kit.state === 'idle' && kit.data != null;
    var kitData = isDone ? kit.data : null;
    React.useEffect(function () {
        if (formRef.current && (kitData === null || kitData === void 0 ? void 0 : kitData.status) === 'success') {
            formRef.current.reset();
        }
    }, [kitData]);
    var _c = (0, use_root_data_ts_1.useRootData)(), user = _c.user, userInfo = _c.userInfo;
    var alreadySubscribed = (_b = userInfo === null || userInfo === void 0 ? void 0 : userInfo.kit) === null || _b === void 0 ? void 0 : _b.tags.some(function (_a) {
        var id = _a.id;
        return id === kitTagId;
    });
    if (alreadySubscribed) {
        return (<div>{"Actually, it looks like you're already signed up to be notified."}</div>);
    }
    var success = isDone && (kitData === null || kitData === void 0 ? void 0 : kitData.status) === 'success';
    return (<kit.Form ref={formRef} action="/action/kit" method="POST" noValidate>
			<div style={{ position: 'absolute', left: '-9999px' }}>
				<label htmlFor={"website-url-".concat(websiteId)}>Your website</label>
				<input type="text" id={"website-url-".concat(websiteId)} name="url" tabIndex={-1} autoComplete="nope"/>
			</div>
			<input type="hidden" name="formId" value={formId}/>
			<input type="hidden" name="kitTagId" value={kitTagId}/>
			<input type="hidden" name="kitFormId" value={kitFormId}/>
			<form_elements_tsx_1.Field name="firstName" label="First name" error={(kitData === null || kitData === void 0 ? void 0 : kitData.status) === 'error' ? kitData.errors.firstName : null} autoComplete="given-name" defaultValue={user === null || user === void 0 ? void 0 : user.firstName} required disabled={kit.state !== 'idle' || success}/>

			<form_elements_tsx_1.Field name="email" label="Email" autoComplete="email" error={(kitData === null || kitData === void 0 ? void 0 : kitData.status) === 'error' ? kitData.errors.email : null} defaultValue={user === null || user === void 0 ? void 0 : user.email} disabled={kit.state !== 'idle' || success}/>

			{success ? (<div className="flex">
					<icons_tsx_1.CheckIcon />
					<p className="text-secondary">
						{(userInfo === null || userInfo === void 0 ? void 0 : userInfo.kit)
                ? "Sweet, you're all set"
                : "Sweet, check your email for confirmation."}
					</p>
				</div>) : (<arrow_button_tsx_1.ArrowButton className="pt-4" type="submit" direction="right">
					Sign me up
				</arrow_button_tsx_1.ArrowButton>)}
		</kit.Form>);
}
