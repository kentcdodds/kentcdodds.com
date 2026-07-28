const TEACHING_STARTED_YEAR = 2014

// Avoid date-fns differenceInYears: its constructFrom path does
// `new date.constructor(...)`, which throws when Date.constructor is
// non-constructable in some browser environments (KCD-100).
function getYearsTeaching(now: Date = new Date()) {
	return now.getFullYear() - TEACHING_STARTED_YEAR
}

export { getYearsTeaching, TEACHING_STARTED_YEAR }
