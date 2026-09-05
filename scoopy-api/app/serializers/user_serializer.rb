class UserSerializer
  def self.render(user)
    {
      id: user.id,
      email: user.email,
      role: user.role
    }
  end
end
