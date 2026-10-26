import {
    CoverageReport,
    type CoverageReportOptions,
} from 'monocart-coverage-reports';

/** Set COVERAGE=1 to collect browser coverage while the specs run. */
export const COVERAGE_ENABLED = process.env.COVERAGE === '1';

// Same folders the unit run measures, plus the API/game layers the unit run skips.
const SOURCE = /^(app|components|hooks|utils|store|services|game)\//;

export const coverageOptions: CoverageReportOptions = {
    name: 'Integration coverage',
    outputDir: 'coverage-integration',
    reports: ['lcovonly', 'console-summary'],
    // Only the app's own bundles, not Next, React or vendored chunks.
    entryFilter: (entry) => entry.url.includes('/_next/static/'),
    sourceFilter: (sourcePath) =>
        SOURCE.test(sourcePath) && !sourcePath.includes('node_modules'),
    // Sources come back as `[project]/components/x.tsx`; keep them project-relative
    // so they line up with the unit run's lcov paths.
    sourcePath: (filePath) => filePath.replace(/^.*\[project\]\//, ''),
};

export const coverageReport = () => new CoverageReport(coverageOptions);
