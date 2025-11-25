-- Create trigger to assign admin role to first user
CREATE TRIGGER assign_admin_to_first_user_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.assign_admin_to_first_user();