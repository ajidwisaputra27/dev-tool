"use client";

import { useEffect, useState } from "react";

interface TimeZoneConfig {
	label: string;
	tz: string;
}

const ZONES: TimeZoneConfig[] = [
	{ label: "Barcelona - Spanyol", tz: "Europe/Madrid" },
	{ label: "Beijing - Tiongkok", tz: "Asia/Shanghai" },
	{ label: "London - Inggris", tz: "Europe/London" },
	{ label: "Mekkah - Arab Saudi", tz: "Asia/Riyadh" },
	{ label: "New York - AS", tz: "America/New_York" },
	{ label: "San Francisco - AS", tz: "America/Los_Angeles" },
	{ label: "Tokyo - Jepang", tz: "Asia/Tokyo" },
];

export default function WorldClocks() {
	const [now, setNow] = useState<Date | null>(null);

	useEffect(() => {
		setNow(new Date());
		const id = window.setInterval(() => setNow(new Date()), 1000);
		return () => window.clearInterval(id);
	}, []);

	if (!now) return null;

	const localDate = new Date(now.toLocaleString("en-US"));
	const zonesWithDiff = ZONES.map((z) => {
		const tzDate = new Date(now.toLocaleString("en-US", { timeZone: z.tz }));
		const diffHours =
			Math.round((tzDate.getTime() - localDate.getTime()) / 60000) / 60;
		return { ...z, diffHours };
	}).sort((a, b) => a.diffHours - b.diffHours);

	return (
		<div className="clocks">
			{zonesWithDiff.map((z) => {
				const diffStr =
					z.diffHours > 0
						? `+${z.diffHours}j`
						: z.diffHours < 0
							? `${z.diffHours}j`
							: `0j`;
				return (
					<div key={z.tz} className="clock-row">
						<span>{z.label}</span>
						<b>
							{now.toLocaleTimeString("en-GB", {
								timeZone: z.tz,
								hour: "2-digit",
								minute: "2-digit",
							})}{" "}
							<span style={{ fontSize: "0.8em", opacity: 0.7 }}>{diffStr}</span>
						</b>
					</div>
				);
			})}
		</div>
	);
}
