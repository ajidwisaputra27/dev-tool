"use client";

import { useEffect, useState } from "react";

interface TimeZoneConfig {
	label: string;
	tz: string;
}

const ZONES: TimeZoneConfig[] = [
	{ label: "barcelona", tz: "Europe/Madrid" },
	{ label: "london", tz: "Europe/London" },
	{ label: "mekkah", tz: "Asia/Riyadh" },
	{ label: "san francisco", tz: "America/Los_Angeles" },
	{ label: "tokyo", tz: "Asia/Tokyo" },
];

export default function WorldClocks() {
	const [now, setNow] = useState<Date>(() => new Date());

	useEffect(() => {
		const id = window.setInterval(() => setNow(new Date()), 1000);
		return () => window.clearInterval(id);
	}, []);

	return (
		<div className="clocks">
			{ZONES.map((z) => (
				<div key={z.tz} className="clock-row">
					<span>{z.label}</span>
					<b>
						{now.toLocaleTimeString("en-GB", {
							timeZone: z.tz,
							hour: "2-digit",
							minute: "2-digit",
						})}
					</b>
				</div>
			))}
		</div>
	);
}
