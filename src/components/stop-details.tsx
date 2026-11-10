import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { PressableScale } from "pressto";
import { useMemo, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { toast } from "sonner-native";

import { useT } from "@/i18n";
import { announce, useLargeText } from "@/lib/accessibility";
import { knownStop, useStop } from "@/lib/api";
import { spokenCode } from "@/lib/format";
import { toggleStop } from "@/lib/saved";
import { usePalette } from "@/theme/colors";
import { layout, radius, size, space } from "@/theme/tokens";
import type { StopDetail } from "@/transit/types";

import { AlertCard } from "./alert-card";
import { ArrivalRow } from "./arrival-row";
import { Button } from "./button";
import { Chip } from "./chip";
import { FeedStatus } from "./feed-status";
import { Icon, icons } from "./icon";
import { NextBus } from "./next-bus";
import { RouteBadge } from "./route-badge";
import { RouteRow } from "./route-row";
import { SkeletonList } from "./skeleton";
import { Empty } from "./state";
import { StopTile } from "./stop-row";
import { Text } from "./text";

/** The buses headed to a stop, the ones the map draws. `only` narrows them to one route, like the list. */
export function incomingBuses(data: StopDetail | undefined, only: string | null) {
  return data?.feed.live ? data.incoming.filter((b) => !only || b.code === only) : [];
}

/** Saving a stop is the same gesture on its own screen and in the home sheet. */
export function useSaveStop() {
  const t = useT();
  return (stop: StopDetail["stop"]) => {
    const added = toggleStop(stop);
    void Haptics.notificationAsync(added ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    if (added) toast.success(t.stop.saved.title, { description: t.stop.saved.body });
    else toast(t.stop.removed);
    announce(added ? `${t.stop.saved.title}. ${t.stop.saved.body}` : t.stop.removed);
  };
}

/** Everything about a stop below the map: its name, the next buses, the routes that call there. */
export function StopDetails({ id, only, onOnly, actions }: { id: string; only: string | null; onOnly: (code: string | null) => void; actions?: ReactNode }) {
  const p = usePalette();
  const t = useT();
  const large = useLargeText();
  const { data, isLoading, isError, refetch } = useStop(id);
  const [early] = useState(() => knownStop(id));
  const stop = data?.stop ?? early;

  const codes = useMemo(() => [...new Set((data?.arrivals ?? []).map((a) => a.code))], [data]);
  const arrivals = (data?.arrivals ?? []).filter((a) => !only || a.code === only);
  const [next, ...later] = arrivals;

  return (
    <>
      {stop && (
        <View style={styles.header}>
          <StopTile kind={stop.kind} tier="lg" />
          <View style={styles.titles}>
            <Text variant="title" accessibilityRole="header" numberOfLines={large ? undefined : 2}>
              {stop.name}
            </Text>
            <View style={styles.meta}>
              <Text variant="caption" tone="muted">
                {stop.kind === "station" ? t.stop.station : t.stop.sitp}
              </Text>
              {stop.accessible && (
                <View style={styles.meta}>
                  <Icon name={icons.wheelchair} color={p.faint} size="xs" />
                  <Text variant="caption" tone="muted">
                    {t.common.accessible}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {actions}
        </View>
      )}
      {isLoading && <SkeletonList rows={5} kind="arrival" />}
      {isError && <Empty title={t.stop.failed.title} body={t.stop.failed.body} action={t.common.retry} onAction={() => void refetch()} />}

      {data && (
        <>
          {codes.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.bleed}>
              <Chip label={t.stop.all} accessibilityLabel={`${t.stop.all}, ${t.stop.allLabel}`} selected={!only} onPress={() => onOnly(null)} />
              {codes.map((c) => {
                const a = data.arrivals.find((x) => x.code === c)!;
                const on = only === c;
                return (
                  <PressableScale
                    key={c}
                    accessibilityRole="button"
                    accessibilityLabel={`${c}, ${t.stop.only(spokenCode(c))}`}
                    accessibilityState={{ selected: on }}
                    hitSlop={space[1]}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      onOnly(on ? null : c);
                    }}
                    style={[styles.chip, { borderColor: on ? p.ink : only ? p.separator : "transparent" }]}>
                    <RouteBadge code={c} system={a.system} />
                  </PressableScale>
                );
              })}
            </ScrollView>
          )}

          {next ? <NextBus arrival={next} /> : <Empty title={t.stop.none.title} body={t.stop.none.body} />}

          <FeedStatus feed={data.feed} />
          <AlertCard alerts={data.alerts} />

          {later.length > 0 && (
            <View>
              <Text variant="title" style={styles.heading}>
                {t.stop.later}
              </Text>
              {later.slice(0, 10).map((a, i) => (
                <ArrivalRow key={`${a.code}-${a.at}-${i}`} arrival={a} first={i === 0} index={i} />
              ))}
            </View>
          )}

          <View>
            <Text variant="title" style={styles.heading}>
              {t.stop.routesHere}
            </Text>
            <View style={styles.bleed}>
              {data.stop.routes.map((r) => (
                <RouteRow key={r.id} route={r} />
              ))}
            </View>
          </View>
        </>
      )}
      {stop && (
        <Button
          variant="quiet"
          height="md"
          label={t.stop.report}
          onPress={() => router.push({ pathname: "/report", params: { stopId: stop.id, stopName: stop.name } })}
        />
      )}
    </>
  );
}

/** A round icon button for the sheet, where there is no header to hold it. */
export function SheetButton({ icon, label, onPress }: { icon: (typeof icons)[keyof typeof icons]; label: string; onPress: () => void }) {
  const p = usePalette();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} hitSlop={space[1]} onPress={onPress} style={[styles.round, { backgroundColor: p.surface }]}>
      <Icon name={icon} color={p.text} size="sm" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: space[3] },
  titles: { flex: 1, gap: space[1] },
  meta: { flexDirection: "row", alignItems: "center", gap: space[1.5], flexWrap: "wrap" },
  bleed: { marginHorizontal: -layout.gutter },
  filters: { gap: space[2], alignItems: "center", paddingHorizontal: layout.gutter },
  chip: { padding: space[0.5], borderRadius: radius.md, borderWidth: size.line.rule, borderCurve: "continuous" },
  heading: { marginBottom: space[1] },
  round: { width: size.control.sm, height: size.control.sm, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
