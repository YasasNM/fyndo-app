"use client";
import Link from "next/link";
import SpotCard, { SkeletonGrid } from "@/components/SpotCard";
import AskFyndo from "@/components/AskFyndo";
import Tour from "@/components/Tour";
import { Ico } from "@/components/Icon";
import { useSpots, useRatings, usePopular, useCollections } from "@/lib/hooks";
import { useWeather } from "@/lib/weather";
import { MOODS } from "@/lib/seed";

// Home has one job: get someone to a place or a plan fast.
// Everything filter-heavy lives on Explore.
const HOME_MOODS = ["Date night", "Cozy café", "Street food", "With friends", "Family", "Budget"];

export default function Home() {
  const { spots, error } = useSpots();
  const ratings = useRatings();
  const popularIds = usePopular();
  const collections = useCollections();
  const weather = useWeather();
  const rainy = weather && (weather.raining || weather.chance >= 60);

  const byIds = (ids) => (spots ? ids.map((id) => spots.find((s) => s.id === id)).filter(Boolean) : []);
  const trending = byIds(popularIds).slice(0, 8);
  const topRated = (spots || []).filter((s) => ratings[s.id] && ratings[s.id].count >= 1)
    .sort((a, b) => ratings[b.id].avg - ratings[a.id].avg || ratings[b.id].count - ratings[a.id].count).slice(0, 8);
  const gems = (spots || []).filter((s) => s.hidden_gem).slice(0, 8);
  const fresh = (spots || []).filter((s) => !s.hidden_gem).slice(0, 8);
  const card = (s) => <SpotCard key={s.id} spot={s} rating={ratings[s.id]} />;
  const Row = ({ title, list, href }) => list.length ? (
    <section className="homerow">
      <div className="row between" style={{ alignItems: "baseline" }}>
        <h2>{title}</h2>
        {href && <Link className="linkbtn" href={href}>See all</Link>}
      </div>
      <div className="hscroll">{list.map(card)}</div>
    </section>
  ) : null;

  return (
    <>
      <h1>Find the real spots.</h1>
      <p className="lede">Tell us what you feel like. We'll find real places in Colombo and plan the night.</p>

      <AskFyndo spots={spots} />

      {rainy && (
        <Link href="/explore?indoor=1" className="rainbar card pad">
          <span className="row" style={{ gap: 8 }}><Ico n="rain" size={20} />{weather.raining ? "It's raining in Colombo." : `Rain likely soon (${weather.chance}%).`}</span>
          <span className="linkbtn">See indoor places</span>
        </Link>
      )}

      <div className="moodrow">
        <h2 className="rowlabel">Or pick a mood</h2>
        <div className="chips">
          {HOME_MOODS.filter((m) => MOODS.includes(m)).map((m) => (
            <Link key={m} className="chip" href={`/explore?mood=${encodeURIComponent(m)}`}>{m}</Link>
          ))}
          <Link className="chip" href="/explore">More</Link>
        </div>
      </div>

      <div className="quick">
        <Link href="/plan" className="qtile dark">
          <span className="ico-wrap"><Ico n="route" size={22} /></span>
          <span><b>Plan a date</b><span className="s">Pick a vibe and budget. Get stops, times, a route and the cost for two.</span></span>
        </Link>
        <Link href="/explore?open=1" className="qtile">
          <span className="ico-wrap"><Ico n="clock" size={22} /></span>
          <span><b>Open right now</b><span className="s">Places you can walk into now</span></span>
        </Link>
      </div>

      {error && <div className="alert">Could not load places. {error}</div>}
      {!spots && !error && <SkeletonGrid n={3} />}
      {spots && spots.length === 0 && (
        <div className="empty">
          <div className="big"><Ico n="pin" size={30} /></div>
          <b>No places yet</b>
          <p style={{ margin: "6px auto 0" }}>Places appear here once the Fyndo team adds them.</p>
        </div>
      )}
      {spots && spots.length > 0 && (
        <>
          <Row title="Trending this week" list={trending} />
          {collections.map((c) => <Row key={c.id} title={c.title} list={byIds(c.spot_ids).slice(0, 8)} />)}
          <Row title="Top rated by Fyndo users" list={topRated} href="/explore" />
          <Row title="Hidden gems" list={gems} />
          {!trending.length && !topRated.length && <Row title="Places to try" list={fresh} href="/explore" />}
          <div className="center" style={{ margin: "26px 0 8px" }}>
            <Link className="btn ghost" href="/explore">Browse all {spots.length} places</Link>
          </div>
        </>
      )}
      <Tour />
    </>
  );
}
