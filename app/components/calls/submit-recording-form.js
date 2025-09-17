"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordingForm = RecordingForm;
var react_1 = require("@remix-run/react");
var React = require("react");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
var button_tsx_1 = require("../button.tsx");
var form_elements_tsx_1 = require("../form-elements.tsx");
function RecordingForm(_a) {
    var _b, _c, _d;
    var audio = _a.audio, data = _a.data;
    var flyPrimaryInstance = (0, use_root_data_ts_1.useRootData)().requestInfo.flyPrimaryInstance;
    var audioURL = React.useMemo(function () {
        return window.URL.createObjectURL(audio);
    }, [audio]);
    var submit = (0, react_1.useSubmit)();
    function handleSubmit(event) {
        event.preventDefault();
        var form = new FormData(event.currentTarget);
        var reader = new FileReader();
        reader.readAsDataURL(audio);
        reader.addEventListener('loadend', function () {
            if (typeof reader.result === 'string') {
                form.append('audio', reader.result);
                submit(form, {
                    method: 'POST',
                    headers: flyPrimaryInstance
                        ? { 'fly-force-instance-id': flyPrimaryInstance }
                        : undefined,
                });
            }
        }, { once: true });
    }
    return (<div>
			<div className="mb-12">
				{(data === null || data === void 0 ? void 0 : data.errors.generalError) ? (<p id="audio-error-message" className="text-center text-red-500">
						{data.errors.generalError}
					</p>) : null}
				{audioURL ? (<audio src={audioURL} controls preload="metadata" aria-describedby="audio-error-message"/>) : ('loading...')}
				{(data === null || data === void 0 ? void 0 : data.errors.audio) ? (<p id="audio-error-message" className="text-red-600 text-center">
						{data.errors.audio}
					</p>) : null}
			</div>

			<react_1.Form onSubmit={handleSubmit}>
				<form_elements_tsx_1.Field name="title" label="Title" defaultValue={(_b = data === null || data === void 0 ? void 0 : data.fields.title) !== null && _b !== void 0 ? _b : ''} error={data === null || data === void 0 ? void 0 : data.errors.title}/>
				<form_elements_tsx_1.Field error={data === null || data === void 0 ? void 0 : data.errors.description} name="description" label="Description" type="textarea" defaultValue={(_c = data === null || data === void 0 ? void 0 : data.fields.description) !== null && _c !== void 0 ? _c : ''}/>

				<form_elements_tsx_1.Field error={data === null || data === void 0 ? void 0 : data.errors.keywords} label="Keywords" description="comma separated values" name="keywords" defaultValue={(_d = data === null || data === void 0 ? void 0 : data.fields.keywords) !== null && _d !== void 0 ? _d : ''}/>

				<button_tsx_1.Button type="submit" className="mt-8">
					Submit Recording
				</button_tsx_1.Button>
			</react_1.Form>
		</div>);
}
