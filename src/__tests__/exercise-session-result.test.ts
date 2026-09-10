import path from 'path';
import ts from 'typescript';
import type {
  LengthResult,
  Location,
  LocationResult,
} from '../types/base.types';
import type { RecordResult } from '../types/results.types';

type ExerciseSessionResult = RecordResult<'ExerciseSession'>;
type RoutePoint = NonNullable<
  NonNullable<ExerciseSessionResult['exerciseRoute']>['route'][number]
>;
type RouteAltitude = NonNullable<RoutePoint['altitude']>;
type LapLength = NonNullable<
  NonNullable<ExerciseSessionResult['laps']>[number]['length']
>;

/**
 * Shape produced by native `lengthToJsMap` (HealthConnectUtils.kt).
 * Assigning this to write-side `Length` is a type error; assigning it to
 * `LengthResult` / read `LocationResult` must succeed.
 */
const nativeLength: LengthResult = {
  inMeters: 12.5,
  inKilometers: 0.0125,
  inMiles: 0.007767,
  inInches: 492.126,
  inFeet: 41.0105,
};

function altitudeInMeters(altitude: RouteAltitude): number {
  return altitude.inMeters;
}

function lapLengthInMeters(length: LapLength): number {
  return length.inMeters;
}

function readLocation(point: LocationResult): number | undefined {
  return point.altitude?.inMeters;
}

function typecheckThisFile(): string[] {
  const configPath = path.resolve(__dirname, '../../tsconfig.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    return [
      ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'),
    ];
  }

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath)
  );
  const program = ts.createProgram({
    rootNames: parsed.fileNames,
    options: { ...parsed.options, noEmit: true },
  });

  return ts
    .getPreEmitDiagnostics(program)
    .filter((diagnostic) =>
      (diagnostic.file?.fileName ?? '').includes(
        'exercise-session-result.test.ts'
      )
    )
    .map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    );
}

describe('ExerciseSession RecordResult', () => {
  it('typechecks read route altitude as LengthResult (inMeters)', () => {
    const point: RoutePoint = {
      time: '2020-01-01T00:00:00Z',
      latitude: 37.78,
      longitude: -122.4,
      altitude: nativeLength,
      horizontalAccuracy: nativeLength,
      verticalAccuracy: nativeLength,
    };
    const altitude = point.altitude;
    if (!altitude) {
      throw new Error('expected altitude');
    }
    const length: LapLength = nativeLength;
    const exerciseRoute: NonNullable<ExerciseSessionResult['exerciseRoute']> = {
      type: 'CONSENT_REQUIRED',
      route: [],
    };

    expect(typecheckThisFile()).toEqual([]);
    expect(altitudeInMeters(altitude)).toBe(12.5);
    expect(readLocation(point)).toBe(12.5);
    expect(lapLengthInMeters(length)).toBe(12.5);
    expect(exerciseRoute.type).toBe('CONSENT_REQUIRED');
  });
});

// Write Location must reject LengthResult. If this @ts-expect-error goes
// unused, Location.altitude was incorrectly changed instead of adding
// LocationResult on the read path.
export function writeLocationRejectsInMeters(): Location {
  return {
    time: '2020-01-01T00:00:00Z',
    latitude: 0,
    longitude: 0,
    // @ts-expect-error write Location.altitude is Length, not LengthResult
    altitude: nativeLength,
  };
}
