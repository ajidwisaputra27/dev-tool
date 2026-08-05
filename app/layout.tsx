import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
	title: "dashboard.dev",
	description:
		"Dashboard produktivitas untuk software engineer: kanban, spotify, pomodoro, dan catatan.",
	icons: {
		icon: [
			{ url: "/favicon.ico", sizes: "32x32" },
			{ url: "/icon.svg", type: "image/svg+xml" },
		],
	},
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="id">
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body>{children}</body>
		</html>
	);
}
