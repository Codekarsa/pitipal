-- Delete the "Other Income" default category
DELETE FROM categories 
WHERE name = 'Other Income' AND is_default = true AND type = 'income';