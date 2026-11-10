import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { DetailScreen } from "@/components/detail-screen";
import { incomingBuses, StopDetails, useSaveStop } from "@/components/stop-details";
import { TransitMap } from "@/components/transit-map";
import { useT } from "@/i18n";
import { knownStop, useStop } from "@/lib/api";
import { useIsSaved } from "@/lib/saved";
import { usePalette } from "@/theme/colors";
import { layout } from "@/theme/tokens";

export default function StopScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const t = useT();
  const { data } = useStop(id);
  const [early] = useState(() => knownStop(id));
  const stop = data?.stop ?? early;
  const saved = useIsSaved("stop", id);
  const save = useSaveStop();
  const [only, setOnly] = useState<string | null>(null);

  return (
    <>
      {data && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={saved ? "star.fill" : "star"}
            tintColor={p.text}
            accessibilityLabel={saved ? t.stop.unsave : t.stop.save}
            onPress={() => save(data.stop)}
          />
        </Stack.Toolbar>
      )}

      <DetailScreen
        map={
          stop && (
            <TransitMap center={{ lat: stop.lat, lon: stop.lon }} zoom={15.5} stops={[stop]} buses={incomingBuses(data, only)} padding={layout.mapInset} />
          )
        }>
        <StopDetails id={id} only={only} onOnly={setOnly} />
      </DetailScreen>
    </>
  );
}
