import { readFileSync } from 'fs';
import { join } from 'path';

const androidSrc = join(__dirname, '..', 'android', 'src', 'main', 'java');
const writeRecordSource = readFileSync(
  join(
    androidSrc,
    'dev/matinzd/healthconnect/records/ReactExerciseSessionRecord.kt'
  ),
  'utf8'
);
const utilsSource = readFileSync(
  join(androidSrc, 'dev/matinzd/healthconnect/utils/HealthConnectUtils.kt'),
  'utf8'
);

function locationConstructor(source: string): string {
  const match = source.match(/ExerciseRoute\.Location\([\s\S]*?\n\s*\)/);
  if (!match) {
    throw new Error('ExerciseRoute.Location write constructor not found');
  }
  return match[0];
}

/**
 * There is no Kotlin test harness in this repo. These assertions lock the
 * write-path contract that issue #210 hits: androidx `ExerciseRoute.Location`
 * takes `Length? = null` for accuracy/altitude, but `getLengthFromJsMap`
 * throws `InvalidLength` ("Length is not valid") on a missing JS map.
 */
describe('ExerciseSession exerciseRoute write path', () => {
  const locationBlock = locationConstructor(writeRecordSource);

  it.each(['horizontalAccuracy', 'verticalAccuracy', 'altitude'] as const)(
    'treats Location.%s as optional (issue #210)',
    (field) => {
      expect(locationBlock).toContain(
        `${field} = sample.getMap("${field}")?.let { getLengthFromJsMap(it) }`
      );
    }
  );

  it('still rejects a missing required Length via getLengthFromJsMap', () => {
    expect(utilsSource).toMatch(
      /fun getLengthFromJsMap\(length: ReadableMap\?\): Length \{\s*if \(length == null\) \{\s*throw InvalidLength\(\)/
    );
  });
});
