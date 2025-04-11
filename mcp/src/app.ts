import { Hono } from "hono";
import {
	layout,
	homeContent,
	parseApproveFormBody,
	renderAuthorizationRejectedContent,
	renderAuthorizationApprovedContent,
	renderLoggedInAuthorizeScreen,
	renderLoggedOutAuthorizeScreen,
} from "./utils";
import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";

export type Bindings = Env & {
	OAUTH_PROVIDER: OAuthHelpers;
};

const app = new Hono<{
	Bindings: Bindings;
}>();

// Render a basic homepage placeholder to make sure the app is up
app.get("/", async (c) => {
	const content = await homeContent(c.req.raw);
	return c.html(layout(content, "MCP Remote Auth Demo - Home"));
});

// Render an authorization page
// If the user is logged in, we'll show a form to approve the appropriate scopes
// If the user is not logged in, we'll show a form to both login and approve the scopes
app.get("/authorize", async (c) => {
	// We don't have an actual auth system, so to demonstrate both paths, you can
	// hard-code whether the user is logged in or not. We'll default to true
	// const isLoggedIn = false;
	const isLoggedIn = true;

	const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);

	const oauthScopes = [
		{
			name: "read_profile",
			description: "Read your basic profile information",
		},
		{ name: "read_data", description: "Access your stored data" },
		{ name: "write_data", description: "Create and modify your data" },
	];

	if (isLoggedIn) {
		const content = await renderLoggedInAuthorizeScreen(oauthScopes, oauthReqInfo);
		return c.html(layout(content, "MCP Remote Auth Demo - Authorization"));
	}

	const content = await renderLoggedOutAuthorizeScreen(oauthScopes, oauthReqInfo);
	return c.html(layout(content, "MCP Remote Auth Demo - Authorization"));
});

// The /authorize page has a form that will POST to /approve
// This endpoint is responsible for validating any login information and
// then completing the authorization request with the OAUTH_PROVIDER
app.post("/approve", async (c) => {
	const { action, oauthReqInfo, email, password } = await parseApproveFormBody(
		await c.req.parseBody(),
	);

	if (!oauthReqInfo) {
		return c.html("INVALID LOGIN", 401);
	}

	// If the user needs to both login and approve, we should validate the login first
	if (action === "login_approve") {
		// We'll allow any values for email and password for this demo
		// but you could validate them here
		// Ex:
		// if (email !== "user@example.com" || password !== "password") {
		// biome-ignore lint/correctness/noConstantCondition: This is a demo
		if (false) {
			return c.html(
				layout(
					await renderAuthorizationRejectedContent("/"),
					"MCP Remote Auth Demo - Authorization Status",
				),
			);
		}
	}

	// The user must be successfully logged in and have approved the scopes, so we
	// can complete the authorization request
	const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
		request: oauthReqInfo,
		userId: email,
		metadata: {
			label: "Test User",
		},
		scope: oauthReqInfo.scope,
		props: {
			userEmail: email,
		},
	});

	return c.html(
		layout(
			await renderAuthorizationApprovedContent(redirectTo),
			"MCP Remote Auth Demo - Authorization Status",
		),
	);
});

export default app;
