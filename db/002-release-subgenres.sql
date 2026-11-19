ALTER TABLE releases ADD COLUMN subgenre text NOT NULL DEFAULT ''
  CHECK (char_length(subgenre) <= 60);

UPDATE releases AS r
SET subgenre = details.subgenre
FROM (VALUES
  ('night-signal', 'Driving Techno'),
  ('chromatic-pressure', 'Hypnotic Techno'),
  ('soft-circuit', 'Deep House'),
  ('below-the-grid', 'Liquid Drum & Bass'),
  ('glass-tides', 'Drone'),
  ('blue-hour', 'Progressive Breaks'),
  ('pulse-theory', 'Minimal Techno'),
  ('acid-bloom', 'Acid House'),
  ('distant-rooms', 'Dark Ambient')
) AS details(slug, subgenre)
WHERE r.demo AND r.slug = details.slug;
