# NyumbaFinder location master

Place the consolidated CSV generated from the Kenya location mapping work at:

`data/NyumbaFinder_Kenya_Location_Master.csv`

The importer reads the Location Master columns:

- `location_id`
- `parent_id`
- `level`
- `level_name`
- `name`
- `slug`
- `county_code`
- `county_name`
- `admin_level_3`
- `admin_level_4`
- `latitude`
- `longitude`

Run:

`npm run db:seed:locations -- data/NyumbaFinder_Kenya_Location_Master.csv`

The master remains the canonical administrative source. User-entered names are stored separately as submissions/aliases and must be reviewed before becoming canonical locations.
