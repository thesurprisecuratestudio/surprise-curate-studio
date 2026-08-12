-- =====================================================================
-- Seed data — matches booking_form.md exactly
-- Safe to re-run (uses NOT EXISTS guards)
-- =====================================================================

-- ---------- Magnet Types ----------
insert into magnet_types (name, sort_order)
select v.name, v.sort_order from (values
  ('Square Magnet', 1),
  ('Rectangle Magnet', 2),
  ('Acrylic Magnet', 3),
  ('Key Chains', 4),
  ('Flexi Magnets', 5),
  ('Round Badge', 6)
) as v(name, sort_order)
where not exists (select 1 from magnet_types m where m.name = v.name);

-- ---------- Add-ons (with real pricing from booking_form.md) ----------
insert into addons (name, description, price, unit_label, sort_order)
select v.name, v.description, v.price, v.unit_label, v.sort_order from (values
  ('Thank You Card 4x6', 'Fully customizable thank you card', 20, 'per card', 1),
  ('Thank You Card 5x7', 'Fully customizable thank you card', 25, 'per card', 2),
  ('Potli Gift Bag 4x6', 'Small potli gift bag', 10, 'per bag', 3),
  ('Potli Gift Bag 5x7', 'Large potli gift bag', 15, 'per bag', 4),
  ('Jute Potli Bag', 'Eco-friendly jute potli bag', 15, 'per bag', 5),
  ('Chocolate ₹1', 'Small chocolate', 1, 'per piece', 6),
  ('Chocolate ₹5', 'Medium chocolate', 5, 'per piece', 7),
  ('Chocolate ₹10', 'Premium chocolate', 10, 'per piece', 8)
) as v(name, description, price, unit_label, sort_order)
where not exists (select 1 from addons a where a.name = v.name);

-- ---------- First Terms & Conditions version ----------
insert into terms_versions (version_number, content, is_active)
select 1,
$$1. Our team will consist of 3-5 members, depending on the event size and service requirements.
2. A separate designated space (decorated or plain) with adequate lighting must be provided for capturing live photographs and carrying out our services.
3. Please arrange 2 large tables (preferably standard catering/food serving tables) and 2-4 chairs for our team.
4. The designated setup area must be located close to a reliable power supply to ensure uninterrupted operation of our equipment.
5. Kindly ensure the allocated space is ready and accessible before our team's arrival to facilitate timely setup and smooth event execution.

I have read, understood, and agree to the above Terms & Requirements. I confirm that all the required arrangements will be made available at the event venue to ensure smooth execution of the service.$$,
true
where not exists (select 1 from terms_versions where version_number = 1);
